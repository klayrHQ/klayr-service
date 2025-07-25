const {
	DB: {
		MySQL: { getTableInstance },
	},
	Signals,
	Logger,
} = require('klayr-service-framework');
const { requestConnector } = require('../utils/request');
const { getPendingIndexReady } = require('./readyIndex');
const { MODULE, MODULE_SUB_STORE } = require('../constants');

const tokenSummaryTableSchema = require('../database/schema/tokenSummary');

const config = require('../../config');

const MYSQL_ENDPOINT = config.endpoints.mysql;
const INDEX_SUPPLY_BLOCK_FREQUENCY = config.supplyIndexing.blockFrequency;

const logger = Logger();

const getTokenSummaryTable = () => getTableInstance(tokenSummaryTableSchema, MYSQL_ENDPOINT);

let supplyTokenID;
let supplyDiff = BigInt(0);
let lastBlockHeight = 0;

const checkBlockCounter = block => {
	if (block === undefined) return false;
	if (INDEX_SUPPLY_BLOCK_FREQUENCY === -1) return false;

	// If frequency is 1 or 0, treat as “always flush” and skip delta math.
	if (INDEX_SUPPLY_BLOCK_FREQUENCY <= 1) return true;

	if (Math.abs(block.height - lastBlockHeight) >= INDEX_SUPPLY_BLOCK_FREQUENCY) {
		lastBlockHeight = block.height;
		return true;
	} else {
		return false;
	}
};

const getTotalSupplyFromDB = async () => {
	const tokenSummaryTable = await getTokenSummaryTable();
	const [data = {}] = await tokenSummaryTable.find({ key: `totalSupply`, limit: 1 }, [
		'key',
		'value',
	]);
	return data.value !== undefined ? BigInt(data.value) : BigInt(0);
};

const getSupplyTokenID = async () => {
	if (supplyTokenID === undefined) {
		const tokenSummaryTable = await getTokenSummaryTable();
		const [data = {}] = await tokenSummaryTable.find({ key: `supplyTokenID`, limit: 1 }, [
			'key',
			'value',
		]);

		if (data.value) {
			supplyTokenID = data.value;
		} else {
			const tokenSupply = await requestConnector('getTotalSupply');
			await setIndexedSupplyTokenID(tokenSupply.totalSupply[0].tokenID);
			supplyTokenID = tokenSupply.totalSupply[0].tokenID;
		}
	}
	return supplyTokenID;
};

const indexTokenSupply = async (block, isBlockDeletion) => {
	const indexedTotalSupply = BigInt(block.reward) - BigInt(block.totalBurnt);

	if (indexedTotalSupply === BigInt(0)) return;

	const absSupply =
		indexedTotalSupply < BigInt(0) ? indexedTotalSupply * BigInt(-1) : indexedTotalSupply;

	if (isBlockDeletion) {
		if (indexedTotalSupply > BigInt(0)) {
			await decreaseIndexedSupply(absSupply, block);
		} else {
			await increaseIndexedSupply(absSupply, block);
		}
	} else {
		if (indexedTotalSupply > BigInt(0)) {
			await increaseIndexedSupply(absSupply, block);
		} else {
			await decreaseIndexedSupply(absSupply, block);
		}
	}
};

const applySupplyDiff = async () => {
	logger.debug('Start indexing supply diff to token total supply...');

	if (supplyDiff > BigInt(0)) {
		const addedSupply = supplyDiff;
		supplyDiff = BigInt(0);
		logger.debug(`Applying supplyDiff of ${addedSupply} by increasing total supply`);
		await increaseIndexedSupply(addedSupply, undefined);
	}

	if (supplyDiff < BigInt(0)) {
		const removedSupply = supplyDiff * BigInt(-1);
		supplyDiff = BigInt(0);
		logger.debug(`Applying supplyDiff of ${removedSupply} by decreasing total supply`);
		await decreaseIndexedSupply(removedSupply, undefined);
	}

	logger.debug('Indexing supply diff completed, supplyDiff successfully cleared');
};

const increaseIndexedSupply = async (addedSupply, block) => {
	if (typeof addedSupply !== 'bigint')
		throw new Error(`increaseIndexedSupply assigned addedSupply is not bigint`);

	const blockFrequencyCounterCheck = checkBlockCounter(block);
	const indexReady = getPendingIndexReady();

	// if block is undefined, then it's called from applySupplyDiff, which means, index immediately
	if (block === undefined || blockFrequencyCounterCheck || indexReady) {
		logger.debug(`Increasing indexed total supply by ${addedSupply}`);
		const tokenSummaryTable = await getTokenSummaryTable();

		const numRowsAffected = await tokenSummaryTable.increment({
			increment: { value: addedSupply },
			where: { key: 'totalSupply' },
		});
		if (numRowsAffected === 0) await initIndexedSupply(addedSupply);
	} else {
		supplyDiff += addedSupply;
	}
};

const decreaseIndexedSupply = async (removedSupply, block) => {
	if (typeof removedSupply !== 'bigint')
		throw new Error(`decreaseIndexedSupply assigned removedSupply is not bigint`);

	const blockFrequencyCounterCheck = checkBlockCounter(block);
	const indexReady = getPendingIndexReady();

	// if block is undefined, then it's called from applySupplyDiff, which means, index immediately
	if (block === undefined || blockFrequencyCounterCheck || indexReady) {
		logger.debug(`Decreasing indexed total supply by ${removedSupply}`);
		const tokenSummaryTable = await getTokenSummaryTable();

		const numRowsAffected = await tokenSummaryTable.decrement({
			decrement: { value: removedSupply },
			where: { key: 'totalSupply' },
		});
		if (numRowsAffected === 0) await initIndexedSupply(removedSupply * BigInt(-1));
	} else {
		supplyDiff -= removedSupply;
	}
};

const setIndexedSupply = async value => {
	if (typeof value !== 'bigint') throw new Error(`setIndexedSupply assigned value is not bigint`);

	const tokenSummaryTable = await getTokenSummaryTable();
	await tokenSummaryTable.upsert({
		key: 'totalSupply',
		value,
	});

	logger.debug(`Token supply updated with value of ${value}`);
};

const setIndexedSupplyTokenID = async value => {
	if (typeof value !== 'string')
		throw new Error(`setIndexedSupplyTokenID assigned value is not string`);

	const tokenSummaryTable = await getTokenSummaryTable();
	await tokenSummaryTable.upsert({
		key: 'supplyTokenID',
		value,
	});

	logger.debug(`Supply token ID updated with value of ${value}`);
};

const initIndexedSupply = async (optionalSupplyDiff = BigInt(0)) => {
	logger.debug('Initializing token supply index...');
	const tokenTotalSupplyData = await requestConnector('getGenesisAssetByModule', {
		module: MODULE.TOKEN,
		subStore: MODULE_SUB_STORE.TOKEN.SUPPLY,
	});
	const tokenTotalSupplyInfos = tokenTotalSupplyData[MODULE_SUB_STORE.TOKEN.SUPPLY][0];
	await setIndexedSupply(BigInt(tokenTotalSupplyInfos.totalSupply) + optionalSupplyDiff);
	await setIndexedSupplyTokenID(tokenTotalSupplyInfos.tokenID);
};

const registerSupplyIndexerOnTerminatedSignal = () => {
	const supplyIndexerOnTerminatedSignalListeder = async () => {
		Signals.get('indexerStopped').remove(supplyIndexerOnTerminatedSignalListeder);
		await applySupplyDiff();
	};
	Signals.get('indexerStopped').add(supplyIndexerOnTerminatedSignalListeder);
};

module.exports = {
	initIndexedSupply,
	indexTokenSupply,
	getTotalSupplyFromDB,
	applySupplyDiff,
	getSupplyTokenID,
	registerSupplyIndexerOnTerminatedSignal,
};
