const {
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const { getNameByAddress } = require('../utils/validator');
const { getKlayr32AddressFromHexAddress } = require('../utils/account');
const regex = require('../../utils/regex');

const config = require('../../../config');
const accountsTableSchema = require('../../database/schema/accounts');
const blocksTableSchema = require('../../database/schema/blocks');
const transactionsTableSchema = require('../../database/schema/transactions');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getAccountsTable = () => getTableInstance(accountsTableSchema, MYSQL_ENDPOINT);
const getBlocksTable = () => getTableInstance(blocksTableSchema, MYSQL_ENDPOINT);
const getTransactionsTable = () => getTableInstance(transactionsTableSchema, MYSQL_ENDPOINT);

const searchAccount = async term => {
	const result = [];

	const address = regex.ADDRESS_HEX.test(term)
		? getKlayr32AddressFromHexAddress(term)
		: regex.ADDRESS_KLAYR32.test(term)
		? term
		: undefined;

	if (!address && regex.NAME.test(term)) {
		const accountsTable = await getAccountsTable();
		const accounts = await accountsTable.find({ search: { property: 'name', startsWith: term } }, [
			'address',
			'name',
		]);
		if (accounts.length > 0) {
			for (let i = 0; i < accounts.length; i++) {
				result.push({
					address: accounts[i].address,
					name: accounts[i].name,
				});
			}
		}
	}

	if (address) {
		const name = await getNameByAddress(term);
		result.push({
			address: term,
			name: name || '',
		});
	}

	return result;
};

const searchBlock = async term => {
	const result = [];

	if (regex.HEIGHT.test(term)) {
		const blocksTable = await getBlocksTable();
		const blocks = await blocksTable.find({ height: Number(term), limit: 1 }, ['height', 'id']);
		if (blocks.length > 0) {
			result.push(blocks[0]);
		}
	}

	if (regex.ID.test(term)) {
		const blocksTable = await getBlocksTable();
		const blocks = await blocksTable.find({ id: term, limit: 1 }, ['height', 'id']);
		if (blocks.length > 0) {
			result.push(blocks[0]);
		}
	}

	return result;
};

const searchTransaction = async term => {
	const result = [];

	if (regex.ID.test(term)) {
		const transactionsTable = await getTransactionsTable();
		const transactions = await transactionsTable.find({ id: term, limit: 1 }, [
			'id',
			'senderAddress',
		]);
		if (transactions.length > 0) {
			result.push({
				id: transactions[0].id,
				sender: transactions[0].senderAddress,
			});
		}
	}

	return result;
};

const search = async params => {
	const result = {
		data: {
			accounts: [],
			blocks: [],
			transactions: [],
		},
		meta: {},
	};

	const [accounts, blocks, transactions] = await Promise.all([
		searchAccount(params.search),
		searchBlock(params.search),
		searchTransaction(params.search),
	]);

	result.data.accounts = accounts;
	result.data.blocks = blocks;
	result.data.transactions = transactions;

	return result;
};

module.exports = { search };
