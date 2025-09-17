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
const util = require('util');
const BluebirdPromise = require('bluebird');

const {
	CacheLRU,
	Logger,
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const logger = Logger();

const { getEventsByHeight, getEventsByBlockID } = require('./events');
const { getFinalizedHeight, MODULE, EVENT, getGenesisHeight } = require('../../constants');
const blocksTableSchema = require('../../database/schema/blocks');
const transactionsTableSchema = require('../../database/schema/transactions');

const { getIndexedAccountInfo } = require('../utils/account');
const { requestConnector } = require('../../utils/request');
const { normalizeRangeParam } = require('../../utils/param');
const { parseToJSONCompatObj } = require('../../utils/parser');
const { normalizeTransaction } = require('../../utils/transactions');
const { getNameByAddress } = require('../../utils/validator');

const config = require('../../../config');
const { JSONParseDB } = require('../utils/json');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const getBlocksTable = () => getTableInstance(blocksTableSchema, MYSQL_ENDPOINT);
const getTransactionsTable = () => getTableInstance(transactionsTableSchema, MYSQL_ENDPOINT);

// NOTE: latestBlockCache is not used anywhere in the codebase.
// const latestBlockCache = CacheRedis('latestBlock', config.endpoints.cache);

const blockCache = CacheLRU('block');
const blockCacheByHeight = CacheLRU('blockByHeight');

let latestBlock;

const normalizeAndCacheBlock = async block => {
	const normalizedBlock = await normalizeBlock(block);
	await blockCacheByHeight.set(block.header.height, JSON.stringify(normalizedBlock));
	return normalizedBlock;
};

const getTransactionByBlockIDFromDB = async blockID => {
	const transactionsTable = await getTransactionsTable();

	const dbResponses = await transactionsTable.find(
		{ blockID },
		Object.getOwnPropertyNames(transactionsTableSchema.schema),
	);

	if (dbResponses.length) {
		return dbResponses.map(formatTransactionResponseFromDB);
	}

	return undefined;
};

const formatTransactionResponseFromDB = transaction => {
	const formattedTransaction = {
		module: transaction.moduleCommand.split(':')[0],
		command: transaction.moduleCommand.split(':')[1],
		params: JSONParseDB(transaction.params),
		nonce: transaction.nonce,
		fee: transaction.fee.toString(),
		senderPublicKey: transaction.senderPublicKey,
		signatures: JSONParseDB(transaction.signatures),
		id: transaction.id,
	};
	return formattedTransaction;
};

const formatBlockResponseFromDB = async (block, skipFetchTransaction = false) => {
	const formattedBlock = {
		header: {
			version: block.version,
			timestamp: block.timestamp,
			height: block.height,
			previousBlockID: block.previousBlockID,
			stateRoot: block.stateRoot,
			assetRoot: block.assetRoot,
			eventRoot: block.eventRoot,
			transactionRoot: block.transactionRoot,
			validatorsHash: block.validatorsHash,
			aggregateCommit: JSONParseDB(block.aggregateCommit),
			generatorAddress: block.generatorAddress,
			maxHeightPrevoted: block.maxHeightPrevoted,
			maxHeightGenerated: block.maxHeightGenerated,
			impliesMaxPrevotes: block.impliesMaxPrevotes,
			signature: block.signature,
			id: block.id,
		},
		transactions: [],
		assets: JSONParseDB(block.assets),
		metadata: {
			generator: JSONParseDB(block.generator),
			networkFee: block.networkFee,
			totalBurnt: block.totalBurnt,
			totalForged: block.totalForged,
			reward: block.reward,
			size: block.size,
			numberOfEvents: block.numberOfEvents,
			numberOfAssets: block.numberOfAssets,
			numberOfTransactions: block.numberOfTransactions,
			isFinal: block.isFinal,
		},
	};

	if (!skipFetchTransaction)
		formattedBlock.transactions = (await getTransactionByBlockIDFromDB(block.id)) || [];

	return formattedBlock;
};

const getBlockByIDFromDB = async (id, skipFetchTransaction = false) => {
	const blocksTable = await getBlocksTable();

	const [dbResponse] = await blocksTable.find(
		{ id, limit: 1 },
		Object.getOwnPropertyNames(blocksTableSchema.schema),
	);

	if (dbResponse) return await formatBlockResponseFromDB(dbResponse, skipFetchTransaction);

	return undefined;
};

const getBlockByHeightFromDB = async (height, skipFetchTransaction = false) => {
	const blocksTable = await getBlocksTable();

	const [dbResponse] = await blocksTable.find(
		{ height, limit: 1 },
		Object.getOwnPropertyNames(blocksTableSchema.schema),
	);

	if (dbResponse) return await formatBlockResponseFromDB(dbResponse, skipFetchTransaction);

	return undefined;
};

const getBlocksByIDsFromDB = async (ids, skipFetchTransaction = false) => {
	const blocksTable = await getBlocksTable();

	const dbResponses = await blocksTable.find(
		{ whereIn: { property: 'id', values: ids } },
		Object.getOwnPropertyNames(blocksTableSchema.schema),
	);

	if (dbResponses.length) {
		return await Promise.all(
			dbResponses.map(block => formatBlockResponseFromDB(block, skipFetchTransaction)),
		);
	}

	return undefined;
};

const getBlocksByHeightsBetweenFromDB = async (
	minHeight,
	maxHeight,
	skipFetchTransaction = false,
) => {
	const blocksTable = await getBlocksTable();

	const dbResponses = await blocksTable.find(
		{
			whereBetween: {
				column: 'height',
				values: [minHeight, maxHeight],
			},
		},
		Object.getOwnPropertyNames(blocksTableSchema.schema),
	);

	if (dbResponses.length) {
		return await Promise.all(
			dbResponses.map(block => formatBlockResponseFromDB(block, skipFetchTransaction)),
		);
	}

	return undefined;
};

function createHeightBetweenArray(from, to) {
	const result = [];
	for (let i = from; i <= to; i++) {
		result.push(i);
	}
	return result;
}

const normalizeFormattedBlock = async originalBlock => {
	const normalizedBlock = {
		// From header
		id: originalBlock.header.id,
		version: originalBlock.header.version,
		height: originalBlock.header.height,
		timestamp: originalBlock.header.timestamp,
		previousBlockID: originalBlock.header.previousBlockID,
		transactionRoot: originalBlock.header.transactionRoot,
		assetRoot: originalBlock.header.assetRoot,
		stateRoot: originalBlock.header.stateRoot,
		eventRoot: originalBlock.header.eventRoot,
		maxHeightGenerated: originalBlock.header.maxHeightGenerated,
		maxHeightPrevoted: originalBlock.header.maxHeightPrevoted,
		validatorsHash: originalBlock.header.validatorsHash,
		aggregateCommit: originalBlock.header.aggregateCommit,
		generatorAddress: originalBlock.header.generatorAddress,
		signature: originalBlock.header.signature,
		impliesMaxPrevotes: originalBlock.header.impliesMaxPrevotes,

		// From metadata
		generator: originalBlock.metadata.generator,
		numberOfTransactions: originalBlock.metadata.numberOfTransactions,
		numberOfAssets: originalBlock.metadata.numberOfAssets,
		numberOfEvents: originalBlock.metadata.numberOfEvents,
		totalBurnt: originalBlock.metadata.totalBurnt,
		networkFee: originalBlock.metadata.networkFee,
		totalForged: originalBlock.metadata.totalForged,
		reward: originalBlock.metadata.reward,
		isFinal: originalBlock.metadata.isFinal,
		size: originalBlock.metadata.size,

		// Transactions and assets
		transactions: originalBlock.transactions,
		assets: originalBlock.assets,
	};

	if (normalizedBlock.isFinal !== true)
		normalizedBlock.isFinal = normalizedBlock.height <= (await getFinalizedHeight());

	return normalizedBlock;
};

const normalizeBlock = async (originalBlock, isDeletedBlock = false, forceFromNode = false) => {
	// NOTE: if a block has metadata, it means it's fetched from db
	// and could be normalized without unnecessary extra steps
	if (Object.hasOwn(originalBlock, 'metadata')) return normalizeFormattedBlock(originalBlock);

	try {
		const blocksTable = await getBlocksTable();

		const block = {
			...originalBlock.header,
			transactions: originalBlock.transactions,
			assets: originalBlock.assets,
		};

		if (block.generatorAddress) {
			const generatorInfo = await getIndexedAccountInfo(
				{ address: block.generatorAddress, limit: 1 },
				['publicKey', 'name'],
			);

			block.generator = {
				address: block.generatorAddress,
				publicKey: generatorInfo ? generatorInfo.publicKey : null,
				name:
					generatorInfo && generatorInfo.name
						? generatorInfo.name
						: await getNameByAddress(block.generatorAddress),
			};
		}

		block.isFinal = block.height <= (await getFinalizedHeight());
		block.numberOfTransactions = block.transactions.length;
		block.numberOfAssets =
			block.height !== (await getGenesisHeight())
				? block.assets.length
				: await (async () => {
						const response = await requestConnector('getGenesisAssetsLength');
						return Object.entries(response).length;
				  })();

		const { numberOfEvents, reward, totalBurnt } = await (async () => {
			if (!forceFromNode) {
				const [dbResponse] = await blocksTable.find({ height: block.height, limit: 1 }, [
					'numberOfEvents',
					'reward',
					'totalBurnt',
				]);

				if (dbResponse) {
					return {
						numberOfEvents: dbResponse.numberOfEvents,
						reward: dbResponse.reward,
						totalBurnt: dbResponse.totalBurnt,
					};
				}
			}

			const events = isDeletedBlock
				? await getEventsByBlockID(block.id)
				: await getEventsByHeight(block.height);
			const blockRewardEvent = events.find(
				e =>
					[MODULE.REWARD, MODULE.DYNAMIC_REWARD].includes(e.module) &&
					e.name === EVENT.REWARD_MINTED,
			);
			const totalBurnt = events.reduce(
				(sum, e) =>
					e.module === MODULE.TOKEN && e.name === EVENT.BURN ? sum + BigInt(e.data.amount) : sum,
				BigInt(0),
			);

			return {
				numberOfEvents: events.length,
				reward: blockRewardEvent ? blockRewardEvent.data.amount : null,
				totalBurnt,
			};
		})();

		block.numberOfEvents = numberOfEvents;
		block.size = 0;
		block.reward = reward;
		block.totalForged = BigInt(reward || '0');
		block.totalBurnt = totalBurnt;
		block.networkFee = BigInt('0');

		block.transactions = await BluebirdPromise.map(
			block.transactions,
			async txn => {
				txn = await normalizeTransaction(txn);

				block.size += txn.size;
				block.totalForged += BigInt(txn.fee);
				block.networkFee += BigInt(txn.fee) - BigInt(txn.minFee);

				// NOTE: totalBurnt should be based on EVENT.BURN event data, not minFee
				// for example, if fee is transferred to token.feePoolAddress config, then minFee will not be burnt
				// block.totalBurnt += BigInt(txn.minFee);
				return txn;
			},
			{ concurrency: block.transactions.length },
		);

		return parseToJSONCompatObj(block);
	} catch (error) {
		logger.error(
			`Error occurred when normalizing block at height ${originalBlock.header.height}, id: ${originalBlock.header.id}:\n${error.stack}`,
		);
		throw error;
	}
};

const normalizeBlocks = async blocks => {
	const normalizedBlocks = await BluebirdPromise.map(blocks, async block => normalizeBlock(block), {
		concurrency: blocks.length,
	});

	return normalizedBlocks;
};

const getBlocksByHeightBetween = async ({ from, to, forceFromNode }) => {
	let blocks = [];

	if (from <= to) {
		if (forceFromNode !== true) {
			// Get from cache
			const heightBetween = createHeightBetweenArray(from, to);
			const cachedBlocks = (
				await Promise.all(heightBetween.map(height => blockCacheByHeight.get(height)))
			).filter(block => block);
			if (cachedBlocks.length === heightBetween.length)
				return cachedBlocks.map(block => JSON.parse(block));

			// Get from DB
			blocks = await getBlocksByHeightsBetweenFromDB(from, to);
		}
		if (blocks.length === 0) {
			blocks = await requestConnector('getBlocksByHeightBetween', { from, to });
		}
		if (blocks.length > 0) {
			blocks = await normalizeBlocks(blocks);
			await BluebirdPromise.map(
				blocks,
				async block => await blockCacheByHeight.set(block.height, JSON.stringify(block)),
				{ concurrency: blocks.length },
			);
		}
	}

	return blocks;
};

const getBlockByHeight = async (height, forceFromNode = false) => {
	if (!forceFromNode) {
		// Get from cache
		const cachedBlocks = await blockCacheByHeight.get(height);
		if (cachedBlocks) return JSON.parse(cachedBlocks);

		// Get from DB first (this is the default behavior)
		const block = await getBlockByHeightFromDB(height);
		if (block) {
			const normalizedBlock = await normalizeBlock(block, false, forceFromNode);
			await blockCacheByHeight.set(height, JSON.stringify(normalizedBlock));
			return normalizedBlock;
		}
	}

	// Get from node
	const response = await requestConnector('getBlockByHeight', { height });
	const normalizedBlock = await normalizeBlock(response);
	await blockCacheByHeight.set(height, JSON.stringify(normalizedBlock));
	return normalizedBlock;
};

const getBlockByID = async (id, forceFromNode = false) => {
	if (!forceFromNode) {
		// Get from cache
		const cachedBlocks = await blockCache.get(id);
		if (cachedBlocks) return JSON.parse(cachedBlocks);

		// Get from DB first (this is the default behavior)
		const block = await getBlockByIDFromDB(id);
		if (block) {
			const normalizedBlock = await normalizeBlock(block, false, forceFromNode);
			await blockCache.set(id, JSON.stringify(normalizedBlock));
			return normalizedBlock;
		}
	}

	// Get from node
	const response = await requestConnector('getBlockByID', { id });
	const normalizedBlock = await normalizeBlock(response);
	await blockCache.set(id, JSON.stringify(normalizedBlock));
	return normalizedBlock;
};

const getBlocksByIDs = async (ids, forceFromNode = false) => {
	if (!forceFromNode) {
		// Get from cache
		const cachedBlocks = (await Promise.all(ids.map(id => blockCache.get(id)))).filter(
			block => block,
		);
		if (cachedBlocks.length === ids.length) return cachedBlocks.map(block => JSON.parse(block));

		// Get from DB first (this is the default behavior)
		const blocks = await normalizeBlocks(await getBlocksByIDsFromDB(ids));
		if (blocks && blocks.length) {
			for (const b of blocks) await blockCache.set(b.id, JSON.stringify(b));
			return blocks;
		}
	}

	// Get from node
	const response = await normalizeBlocks(await requestConnector('getBlocksByIDs', { ids }));
	for (const b of response) await await blockCache.set(b.id, JSON.stringify(b));
	return response;
};

const getLastBlockFromNode = async () => {
	const response = await requestConnector('getLastBlock');
	latestBlock = await normalizeBlock(response);
	if (latestBlock && latestBlock.id) {
		// NOTE: latestBlockCache is not used anywhere in the codebase.
		// await latestBlockCache.set('latestBlock', JSON.stringify(latestBlock));
	}
	return latestBlock;
};

const isQueryFromIndex = params => {
	const paramProps = Object.getOwnPropertyNames(params);

	const directQueryParams = ['id', 'height', 'heightBetween'];
	const defaultQueryParams = ['limit', 'offset', 'sort'];

	// For 'isDirectQuery' to be 'true', the request params should contain
	// exactly one of 'directQueryParams' and all of them must be contained
	// within 'directQueryParams' or 'defaultQueryParams'
	const isDirectQuery =
		paramProps.filter(prop => directQueryParams.includes(prop)).length === 1 &&
		paramProps.every(prop => directQueryParams.concat(defaultQueryParams).includes(prop));

	const sortOrder = params.sort ? params.sort.split(':')[1] : undefined;
	const isLatestBlockFetch =
		(paramProps.length === 1 && params.limit === 1) ||
		(paramProps.length === 2 &&
			((params.limit === 1 && params.offset === 0) ||
				(sortOrder === 'desc' && (params.limit === 1 || params.offset === 0)))) ||
		(paramProps.length === 3 && params.limit === 1 && params.offset === 0 && sortOrder === 'desc');

	return !isDirectQuery && !isLatestBlockFetch;
};

const formatBlock = async (block, isDeletedBlock = false) => normalizeBlock(block, isDeletedBlock);

// TODO: this still feels slow
const getBlocks = async params => {
	const blocksTable = await getBlocksTable();
	const blocks = {
		data: [],
		meta: {},
	};

	if (params.blockID) {
		const { blockID, ...remParams } = params;
		params = remParams;
		params.id = blockID;
	}

	if (params.height && typeof params.height === 'string' && params.height.includes(':')) {
		params = normalizeRangeParam(params, 'height');
	}

	if (params.timestamp && params.timestamp.includes(':')) {
		params = normalizeRangeParam(params, 'timestamp');
	}

	let resultSet = [];
	const total = await blocksTable.count(params);

	if (isQueryFromIndex(params)) {
		resultSet = await blocksTable.find(
			params,
			Object.getOwnPropertyNames(blocksTableSchema.schema),
		);
		params.ids = resultSet.map(row => row.id);
	}

	try {
		// Under normal circumstances params.ids will always populated,
		// So we could directly use resultSet without any re-fetch
		// In case params.ids is not available, we re-fetch blocks by id/height/lastBlock

		if (params.ids) {
			if (Array.isArray(params.ids) && params.ids.length) {
				blocks.data = await BluebirdPromise.map(resultSet, block => {
					return {
						...block,
						aggregateCommit: JSON.parse(block.aggregateCommit),
						generator: JSON.parse(block.generator),
					};
				});
			}
		} else if (params.id) {
			blocks.data.push(await getBlockByID(params.id));
			if ('offset' in params && params.limit)
				blocks.data = blocks.data.slice(params.offset, params.offset + params.limit);
		} else if (params.height) {
			blocks.data.push(await getBlockByHeight(Number(params.height)));
			if ('offset' in params && params.limit)
				blocks.data = blocks.data.slice(params.offset, params.offset + params.limit);
		} else {
			blocks.data.push(await getLastBlockFromNode());
		}
	} catch (err) {
		if (!err.message.includes('does not exist')) throw err;
	}

	blocks.meta = {
		count: blocks.data.length,
		offset: params.offset,
		total,
	};

	return blocks;
};

const filterBlockAssets = (modules, block) => {
	const filteredBlockAssets = modules.length
		? block.assets.filter(asset => modules.includes(String(asset.module)))
		: block.assets;
	return filteredBlockAssets;
};

const getBlocksAssets = async params => {
	const blocksTable = await getBlocksTable();
	const blockAssets = {
		data: [],
		meta: {},
	};

	const modules = [];

	if (params.blockID) {
		const { blockID, ...remParams } = params;
		params = remParams;
		params.id = blockID;
	}

	if (params.height && typeof params.height === 'string' && params.height.includes(':')) {
		params = normalizeRangeParam(params, 'height');
	}

	if (params.timestamp && params.timestamp.includes(':')) {
		params = normalizeRangeParam(params, 'timestamp');
	}

	if (params.module) {
		const { module, ...remParams } = params;
		const moduleArr = String(module).split(',');
		modules.push(...moduleArr);
		params = remParams;
		params.whereJsonSupersetOf = { property: 'assetsModules', values: modules };
	}

	logger.debug(`Querying index to retrieve block IDs with params: ${util.inspect(params)}`);
	const total = await blocksTable.count(params);
	const blocksFromDB = await blocksTable.find(
		params,
		Object.getOwnPropertyNames(blocksTableSchema.schema),
	);

	logger.debug(
		`Requesting blockchain application for blocks with IDs: ${blocksFromDB
			.map(b => b.id)
			.join(', ')}`,
	);
	blockAssets.data = await BluebirdPromise.map(
		blocksFromDB,
		async blockFromDB => {
			const block = {
				...blockFromDB,
				assets: JSON.parse(blockFromDB.assets),
			};
			return {
				block: {
					id: block.id,
					height: block.height,
					timestamp: block.timestamp,
				},
				assets: filterBlockAssets(modules, block),
			};
		},
		{ concurrency: blocksFromDB.length },
	);

	blockAssets.meta = {
		count: blockAssets.data.length,
		offset: params.offset,
		total,
	};

	return blockAssets;
};

module.exports = {
	formatBlock,
	getBlocks,
	getFinalizedHeight,
	normalizeBlock,
	normalizeBlocks,
	getLastBlockFromNode,
	getBlockByHeight,
	getBlockByID,
	getBlocksByIDs,
	getBlocksByHeightBetween,
	getBlocksAssets,
	getTransactionByBlockIDFromDB,
	formatTransactionResponseFromDB,
	normalizeAndCacheBlock,
};
