/*
 * Klayrhq/klayrservice
 * Copyright © 2022 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
const BluebirdPromise = require('bluebird');

const {
	CacheLRU,
	Exceptions: { InvalidParamsException },
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const { getBlockByID, formatTransactionResponseFromDB } = require('./blocks');
const { getEventsByHeight } = require('./events');

const { getCurrentChainID } = require('./interoperability/chain');
const { getIndexedAccountInfo } = require('../utils/account');
const { requestConnector } = require('../../utils/request');
const { normalizeRangeParam } = require('../../utils/param');
const { normalizeTransaction, getTransactionExecutionStatus } = require('../../utils/transactions');
const { getFinalizedHeight } = require('../../constants');

const transactionsTableSchema = require('../../database/schema/transactions');
const config = require('../../../config');
const { getKlayr32AddressFromPublicKey } = require('../../utils/account');
const { JSONParseDB } = require('../utils/json');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const transactionCache = CacheLRU('transaction');

const getTransactionsTable = () => getTableInstance(transactionsTableSchema, MYSQL_ENDPOINT);

const getTotalTransactions = async () => {
	const transactionsTable = await getTransactionsTable();
	const total = Number(await transactionsTable.count());
	return total;
};

const getTransactionByIDFromDB = async id => {
	const transactionsTable = await getTransactionsTable();

	const [dbResponse] = await transactionsTable.find(
		{ id, limit: 1 },
		Object.getOwnPropertyNames(transactionsTableSchema.schema),
	);

	if (dbResponse) return formatTransactionResponseFromDB(dbResponse);

	return undefined;
};

const getTransactionsByIDsFromDB = async ids => {
	const transactionsTable = await getTransactionsTable();

	const dbResponses = await transactionsTable.find(
		{ whereIn: { property: 'id', values: ids } },
		Object.getOwnPropertyNames(transactionsTableSchema.schema),
	);

	if (dbResponses.length) {
		return dbResponses.map(formatTransactionResponseFromDB);
	}

	return undefined;
};

const getTransactionIDsByBlockID = async blockID => {
	const transactionsTable = await getTransactionsTable();
	const transactions = await transactionsTable.find(
		{
			whereIn: {
				property: 'blockID',
				values: [blockID],
			},
		},
		['id'],
	);
	const transactionsIds = transactions.map(t => t.id);
	return transactionsIds;
};

const normalizeTransactions = async txs => {
	const normalizedTransactions = await BluebirdPromise.map(
		txs,
		async tx => normalizeTransaction(tx),
		{ concurrency: txs.length },
	);
	return normalizedTransactions;
};

const getTransactionByID = async (id, forceFromNode = false) => {
	if (!forceFromNode) {
		// Get from cache
		const cachedTransaction = await transactionCache.get(id);
		if (cachedTransaction) return JSON.parse(cachedTransaction);

		// Get from DB first (this is the default behavior)
		const transaction = await getTransactionByIDFromDB(id);
		if (transaction) {
			const normalizedTransaction = await normalizeTransaction(transaction);
			await transactionCache.set(id, JSON.stringify(normalizedTransaction));
			return normalizedTransaction;
		}
	}

	// Get from node
	const response = await requestConnector('getTransactionByID', { id });
	const normalizedTransaction = await normalizeTransaction(response);
	await transactionCache.set(id, JSON.stringify(normalizedTransaction));
	return normalizedTransaction;
};

const getTransactionsByIDs = async (ids, forceFromNode = false) => {
	if (!forceFromNode) {
		// Get from cache
		const cachedTransaction = (await Promise.all(ids.map(id => transactionCache.get(id)))).filter(
			tx => tx,
		);
		if (cachedTransaction.length === ids.length) return cachedTransaction.map(tx => JSON.parse(tx));

		// Get from DB first (this is the default behavior)
		const transaction = await normalizeTransactions(await getTransactionsByIDsFromDB(ids));
		if (transaction && transaction.length) {
			for (const tx of transaction) await transactionCache.set(tx.id, JSON.stringify(tx));
			return transaction;
		}
	}

	// Get from node
	const response = await normalizeTransactions(
		await requestConnector('getTransactionsByIDs', { ids }),
	);
	for (const tx of response) await transactionCache.set(tx.id, JSON.stringify(tx));
	return normalizeTransactions(response);
};

const validateParams = async params => {
	if (params.height && typeof params.height === 'string' && params.height.includes(':')) {
		params = normalizeRangeParam(params, 'height');
	}

	if (params.timestamp && params.timestamp.includes(':')) {
		params = normalizeRangeParam(params, 'timestamp');
	}

	if (params.nonce && !params.senderAddress) {
		throw new InvalidParamsException(
			'Nonce based retrieval is only possible along with senderAddress',
		);
	}

	// If recieving chainID is current chain ID then return all transactions with receivingChainID = null
	if (params.receivingChainID) {
		const currentChainID = await getCurrentChainID();

		if (params.receivingChainID === currentChainID) {
			params.receivingChainID = null;
		}
	}

	if (params.executionStatus) {
		const { executionStatus, ...remParams } = params;
		params = remParams;

		const validStatuses = ['pending', 'successful', 'failed'];
		const executionStatuses = new Set(
			executionStatus
				.split(',')
				.map(e => e.trim())
				.filter(e => e !== 'any' && validStatuses.includes(e)),
		);

		if (executionStatuses.size > 0 && executionStatuses.size < validStatuses.length) {
			params.whereIn = { property: 'executionStatus', values: [...executionStatuses] };
		}
	}

	// When `address` is provided, build a UNION of sender/recipient queries to improve performance using two composite index
	if (params.address) {
		const { address, ...remParams } = params;
		params = remParams;

		const innerQueryLimit = params.limit ? params.limit + (params.offset || 0) : undefined;

		params.union = [
			{
				...remParams,
				forceIndex: 'transactions_index_sender_sort',
				senderAddress: address,
				limit: innerQueryLimit,
			},
			{
				...remParams,
				forceIndex: 'transactions_index_recipient_sort',
				recipientAddress: address,
				limit: innerQueryLimit,
			},
		];

		// Remove schema filters from outer query (already applied in union)
		const tableColumns = Object.getOwnPropertyNames(transactionsTableSchema.schema);
		Object.getOwnPropertyNames(params).forEach(t => {
			if (tableColumns.includes(t)) {
				delete params[t];
			}
		});
	}

	return params;
};

const getTransactions = async params => {
	const transactionsTable = await getTransactionsTable();
	const transactions = {
		data: [],
		meta: {},
	};

	const { order, sort, limit, offset, ...paramsWithoutOrderSortLimitOffset } = params;
	const countParams = await validateParams(paramsWithoutOrderSortLimitOffset);
	const total = Number(await transactionsTable.count(countParams));

	params = await validateParams(params);

	const resultSet = await transactionsTable.find(
		{ ...params, limit: params.limit || total },
		Object.getOwnPropertyNames(transactionsTableSchema.schema),
	);

	if (resultSet.length) transactions.data = resultSet;

	transactions.data = await BluebirdPromise.map(
		transactions.data,
		async transaction => {
			const senderAddress = getKlayr32AddressFromPublicKey(transaction.senderPublicKey);
			const senderAccount = await getIndexedAccountInfo({ address: senderAddress, limit: 1 }, [
				'name',
			]);

			transaction.sender = {
				address: senderAddress,
				publicKey: transaction.senderPublicKey,
				name: senderAccount ? senderAccount.name : null,
			};

			transaction.params = JSONParseDB(transaction.params);
			transaction.signatures = JSONParseDB(transaction.signatures);

			if (transaction.params.recipientAddress) {
				const recipientAccount = await getIndexedAccountInfo(
					{ address: transaction.params.recipientAddress, limit: 1 },
					['publicKey', 'name'],
				);

				transaction.meta = {
					recipient: {
						address: transaction.params.recipientAddress,
						publicKey: recipientAccount ? recipientAccount.publicKey : null,
						name: recipientAccount ? recipientAccount.name : null,
					},
				};
			}

			transaction.block = {
				id: transaction.blockID,
				height: transaction.height,
				timestamp: transaction.timestamp,
				isFinal: transaction.height <= (await getFinalizedHeight()),
			};

			return transaction;
		},
		{ concurrency: transactions.data.length },
	);

	transactions.meta.total = total;
	transactions.meta.count = transactions.data.length;
	transactions.meta.offset = params.offset;

	return transactions;
};

const formatTransactionsInBlock = async block => {
	const transactions = await BluebirdPromise.map(
		block.transactions,
		async (transaction, index) => {
			const senderAddress = getKlayr32AddressFromPublicKey(transaction.senderPublicKey);

			const senderAccount = await getIndexedAccountInfo({ address: senderAddress, limit: 1 }, [
				'name',
			]);

			transaction.sender = {
				address: senderAddress,
				publicKey: transaction.senderPublicKey,
				name: senderAccount ? senderAccount.name : null,
			};

			if (transaction.params.recipientAddress) {
				const recipientAccount = await getIndexedAccountInfo(
					{ address: transaction.params.recipientAddress, limit: 1 },
					['publicKey', 'name'],
				);

				transaction.meta = {
					recipient: {
						address: transaction.params.recipientAddress,
						publicKey: recipientAccount ? recipientAccount.publicKey : null,
						name: recipientAccount ? recipientAccount.name : null,
					},
				};
			}

			transaction.block = {
				id: block.id,
				height: block.height,
				timestamp: block.timestamp,
				isFinal: block.isFinal,
			};

			const transactionsTable = await getTransactionsTable();
			const [indexedTxInfo = {}] = await transactionsTable.find({ id: transaction.id, limit: 1 }, [
				'executionStatus',
			]);

			if (indexedTxInfo.executionStatus) {
				transaction.executionStatus = indexedTxInfo.executionStatus;
			} else {
				const events = await getEventsByHeight(block.height);
				transaction.executionStatus = await getTransactionExecutionStatus(transaction, events);
			}

			transaction.index = index;
			return transaction;
		},
		{ concurrency: block.transactions.length },
	);

	return {
		data: transactions,
		meta: {
			offset: 0,
			count: transactions.length,
			total: transactions.length,
		},
	};
};

const getTransactionsByBlockID = async blockID => {
	const block = await getBlockByID(blockID);
	return formatTransactionsInBlock(block);
};

module.exports = {
	getTransactions,
	getTransactionIDsByBlockID,
	getTransactionsByBlockID,
	getTransactionsByIDs,
	normalizeTransaction,
	formatTransactionsInBlock,
	getTotalTransactions,

	// for db indexnig use
	formatTransactionResponseFromDB,
	getTransactionByID,

	// For unit test
	validateParams,
	normalizeTransactions,
};
