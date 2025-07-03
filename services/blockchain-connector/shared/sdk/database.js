const {
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const blocksTableSchema = require('../database/schema/blocks');
const transactionsTableSchema = require('../database/schema/transactions');

const config = require('../../config');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const getBlocksTable = () => getTableInstance(blocksTableSchema, MYSQL_ENDPOINT);
const getTransactionsTable = () => getTableInstance(transactionsTableSchema, MYSQL_ENDPOINT);

const formatBlockResponseFromDB = async block => {
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
			aggregateCommit: JSON.parse(block.aggregateCommit),
			generatorAddress: block.generatorAddress,
			maxHeightPrevoted: block.maxHeightPrevoted,
			maxHeightGenerated: block.maxHeightGenerated,
			impliesMaxPrevotes: block.impliesMaxPrevotes,
			signature: block.signature,
			id: block.id,
		},
		transactions: [],
		assets: JSON.parse(block.assets),
	};
	formattedBlock.transactions = (await getTransactionByBlockIDFromDB(block.id)) || [];
	return formattedBlock;
};

const formatTransactionResponseFromDB = transaction => {
	const formattedTransaction = {
		module: transaction.moduleCommand.split(':')[0],
		command: transaction.moduleCommand.split(':')[1],
		params: JSON.parse(transaction.params),
		nonce: transaction.nonce,
		fee: transaction.fee.toString(),
		senderPublicKey: transaction.senderPublicKey,
		signatures: JSON.parse(transaction.signatures),
		id: transaction.id,
	};
	return formattedTransaction;
};

const getBlockByIDFromDB = async id => {
	const blocksTable = await getBlocksTable();

	const [dbResponse] = await blocksTable.find(
		{ id, limit: 1 },
		Object.getOwnPropertyNames(blocksTableSchema.schema),
	);

	if (dbResponse) return await formatBlockResponseFromDB(dbResponse);

	return undefined;
};

const getBlockByHeightFromDB = async height => {
	const blocksTable = await getBlocksTable();

	const [dbResponse] = await blocksTable.find(
		{ height, limit: 1 },
		Object.getOwnPropertyNames(blocksTableSchema.schema),
	);

	if (dbResponse) return await formatBlockResponseFromDB(dbResponse);

	return undefined;
};

const getBlocksByIDsFromDB = async ids => {
	const blocksTable = await getBlocksTable();

	const dbResponses = await blocksTable.find(
		{ whereIn: { property: 'id', values: ids } },
		Object.getOwnPropertyNames(blocksTableSchema.schema),
	);

	if (dbResponses.length) {
		return dbResponses.map(async block => await formatBlockResponseFromDB(block));
	}

	return undefined;
};

const getBlocksByHeightsFromDB = async heights => {
	const blocksTable = await getBlocksTable();

	const dbResponses = await blocksTable.find(
		{ whereIn: { property: 'height', values: heights } },
		Object.getOwnPropertyNames(blocksTableSchema.schema),
	);

	if (dbResponses.length) {
		return dbResponses.map(async block => await formatBlockResponseFromDB(block));
	}

	return undefined;
};

const getBlocksByHeightsBetweenFromDB = async (minHeight, maxHeight) => {
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
		return dbResponses.map(async block => await formatBlockResponseFromDB(block));
	}

	return undefined;
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

const getTransactionsByBlockIDsFromDB = async blockIds => {
	const transactionsTable = await getTransactionsTable();

	const dbResponses = await transactionsTable.find(
		{ whereIn: { property: 'blockID', values: blockIds } },
		Object.getOwnPropertyNames(transactionsTableSchema.schema),
	);

	if (dbResponses.length) {
		return dbResponses.map(formatTransactionResponseFromDB);
	}

	return undefined;
};

module.exports = {
	getBlockByIDFromDB,
	getBlockByHeightFromDB,
	getBlocksByIDsFromDB,
	getBlocksByHeightsFromDB,
	getBlocksByHeightsBetweenFromDB,
	getTransactionByIDFromDB,
	getTransactionByBlockIDFromDB,
	getTransactionsByIDsFromDB,
	getTransactionsByBlockIDsFromDB,
};
