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
const blocksTableSchema = require('../database/schema/blocks');

const config = require('../../config');
const { getLastIndexedBlock } = require('./lastIndexedBlock');

const MYSQL_ENDPOINT = config.endpoints.mysql;
const INDEX_SUPPLY_BLOCK_FREQUENCY = config.supplyIndexing.blockFrequency;

const logger = Logger();

const getTokenSummaryTable = () => getTableInstance(tokenSummaryTableSchema, MYSQL_ENDPOINT);
const getBlocksTable = () => getTableInstance(blocksTableSchema, MYSQL_ENDPOINT);

let supplyTokenID;
let supplyDiff = BigInt(0);

// 'lastIndexedSupplyHeight' key in db is used to check periodic flush, and more improtantly, to recover unindexed supply height in case of crash or unexpected shutdown
let lastBlockHeight;
// 'previousBlockFrequency' key in db is used to store latest blockFrequency config used other than 0/1, which useful for safely skip/optimize certain supply indexing operations
let previousBlockFrequency;

const checkBlockCounter = async block => {
	if (INDEX_SUPPLY_BLOCK_FREQUENCY === -1) return false;

	// If frequency is 1 or 0, treat as “always flush” and skip delta math.
	if (INDEX_SUPPLY_BLOCK_FREQUENCY <= 1) return true;

	const lastIndexedSupplyHeight = (await getLastIndexedSupplyHeight()) ?? 0;
	if (Math.abs(block.height - lastIndexedSupplyHeight) >= INDEX_SUPPLY_BLOCK_FREQUENCY) {
		return true;
	}

	return false;
};

const adjustSupplyMethod = async (adjustedSupply, block, isBlockDeletion, dbTrx) => {
	const absSupply = adjustedSupply < BigInt(0) ? adjustedSupply * BigInt(-1) : adjustedSupply;

	if (isBlockDeletion) {
		if (adjustedSupply > BigInt(0)) {
			await decreaseIndexedSupply(absSupply, block, dbTrx);
		} else {
			await increaseIndexedSupply(absSupply, block, dbTrx);
		}
	} else {
		if (adjustedSupply > BigInt(0)) {
			await increaseIndexedSupply(absSupply, block, dbTrx);
		} else {
			await decreaseIndexedSupply(absSupply, block, dbTrx);
		}
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

const getLastIndexedSupplyHeightFromDB = async () => {
	const tokenSummaryTable = await getTokenSummaryTable();
	const [data = {}] = await tokenSummaryTable.find({ key: `lastIndexedSupplyHeight`, limit: 1 }, [
		'key',
		'value',
	]);
	return data.value !== undefined ? Number(data.value) : undefined;
};

const getLastIndexedSupplyHeight = async () => {
	if (lastBlockHeight === undefined) {
		lastBlockHeight = await getLastIndexedSupplyHeightFromDB();
	}
	return lastBlockHeight;
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

const getSupplyIndexerBlockFrequency = async () => {
	if (previousBlockFrequency === undefined) {
		// NOTE: we don't assign global previousBlockFrequency if it's not set, instead it will be assigned on setPreviousBlockFrequency
		const tokenSummaryTable = await getTokenSummaryTable();
		const [data = {}] = await tokenSummaryTable.find({ key: 'previousBlockFrequency', limit: 1 }, [
			'key',
			'value',
		]);
		if (data.value) return Number(data.value);
		return INDEX_SUPPLY_BLOCK_FREQUENCY;
	}
	return previousBlockFrequency;
};

const indexTokenSupply = async (block, dbTrx, isBlockDeletion) => {
	const indexedTotalSupply = BigInt(block.reward) - BigInt(block.totalBurnt);

	if (indexedTotalSupply === BigInt(0)) return;

	await adjustSupplyMethod(indexedTotalSupply, block, isBlockDeletion, dbTrx);
};

const applySupplyDiff = async () => {
	logger.debug('Start indexing supply diff to token total supply...');

	if (supplyDiff > BigInt(0)) {
		const addedSupply = supplyDiff;
		supplyDiff = BigInt(0);
		const lastIndexedBlock = await getLastIndexedBlock();
		logger.debug(
			`Applying supplyDiff of ${addedSupply} until block height ${lastIndexedBlock.height} by increasing total supply`,
		);
		await increaseIndexedSupply(addedSupply, lastIndexedBlock, undefined, true);
	}

	if (supplyDiff < BigInt(0)) {
		const removedSupply = supplyDiff * BigInt(-1);
		supplyDiff = BigInt(0);
		const lastIndexedBlock = await getLastIndexedBlock();
		logger.debug(
			`Applying supplyDiff of ${removedSupply} until block height ${lastIndexedBlock.height} by decreasing total supply`,
		);
		await decreaseIndexedSupply(removedSupply, lastIndexedBlock, undefined, true);
	}

	logger.debug('Indexing supply diff completed, supplyDiff successfully cleared');
};

const increaseIndexedSupply = async (addedSupply, block, dbTrx, forceDBWrite) => {
	if (typeof addedSupply !== 'bigint')
		throw new Error(`increaseIndexedSupply assigned addedSupply is not bigint`);

	const blockFrequencyCounterCheck = await checkBlockCounter(block);
	const indexReady = getPendingIndexReady();

	if (forceDBWrite === true || blockFrequencyCounterCheck || indexReady) {
		logger.debug(`Increasing indexed total supply by ${addedSupply}`);
		const tokenSummaryTable = await getTokenSummaryTable();

		const numRowsAffected = await tokenSummaryTable.increment(
			{
				increment: { value: addedSupply },
				where: { key: 'totalSupply' },
			},
			dbTrx,
		);
		if (numRowsAffected === 0) await initIndexedSupply(addedSupply);

		await setLastIndexedSupplyHeight(block.height);
	} else {
		supplyDiff += addedSupply;
	}
};

const decreaseIndexedSupply = async (removedSupply, block, dbTrx, forceDBWrite) => {
	if (typeof removedSupply !== 'bigint')
		throw new Error(`decreaseIndexedSupply assigned removedSupply is not bigint`);

	const blockFrequencyCounterCheck = await checkBlockCounter(block);
	const indexReady = getPendingIndexReady();

	if (forceDBWrite === true || blockFrequencyCounterCheck || indexReady) {
		logger.debug(`Decreasing indexed total supply by ${removedSupply}`);
		const tokenSummaryTable = await getTokenSummaryTable();

		const numRowsAffected = await tokenSummaryTable.decrement(
			{
				decrement: { value: removedSupply },
				where: { key: 'totalSupply' },
			},
			dbTrx,
		);
		if (numRowsAffected === 0) await initIndexedSupply(removedSupply * BigInt(-1));

		await setLastIndexedSupplyHeight(block.height);
	} else {
		supplyDiff -= removedSupply;
	}
};

const setPreviousBlockFrequency = async () => {
	if (previousBlockFrequency !== undefined) return;

	const tokenSummaryTable = await getTokenSummaryTable();
	await tokenSummaryTable.upsert({
		key: 'previousBlockFrequency',
		value: INDEX_SUPPLY_BLOCK_FREQUENCY.toString(),
	});

	previousBlockFrequency = INDEX_SUPPLY_BLOCK_FREQUENCY;
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

const setLastIndexedSupplyHeight = async value => {
	// if blockFrequency is 0 or 1, it means we are indexing every block, hence we could skip this operation for oprimization
	const blockFrequency = await getSupplyIndexerBlockFrequency();
	if ([0, 1].includes(blockFrequency)) return;

	if (typeof value !== 'number')
		throw new Error(`setIndexedSupplyTokenID assigned value is not number`);

	const tokenSummaryTable = await getTokenSummaryTable();
	await tokenSummaryTable.upsert({
		key: 'lastIndexedSupplyHeight',
		value: value.toString(),
	});

	lastBlockHeight = value;
	logger.debug(`Last indexed supply height updated with value of ${value}`);
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
	const supplyIndexerOnTerminatedSignalListener = async () => {
		Signals.get('indexerStopped').remove(supplyIndexerOnTerminatedSignalListener);
		await applySupplyDiff();
	};
	Signals.get('indexerStopped').add(supplyIndexerOnTerminatedSignalListener);
};

const getMissingTotalSupplyDiff = async (from, to, batchSize = 10000) => {
	if (typeof from !== 'number')
		throw new Error(`getMissingTotalSupply assigned from is not number`);
	if (typeof to !== 'number') throw new Error(`getMissingTotalSupply assigned to is not number`);
	if (from > to) throw new Error(`getMissingTotalSupply assigned from can't be greater than to`);
	if (from === to) return BigInt(0);

	const blocksTable = await getBlocksTable();
	let totalDiff = BigInt(0);
	let currentFrom = from;

	while (currentFrom <= to) {
		const currentTo = Math.min(currentFrom + batchSize - 1, to);
		const query = `
			SELECT
				COALESCE(SUM(reward - totalBurnt), 0) AS missingTotalSupply
			FROM
				blocks
			WHERE
				height BETWEEN ${currentFrom} AND ${currentTo};
		`;

		const [data] = await blocksTable.rawQuery(query);
		const batchDiff = BigInt(data?.missingTotalSupply ?? 0);
		totalDiff += batchDiff;

		currentFrom = currentTo + 1;
	}

	return totalDiff;
};

const indexMissingTotalSupply = async ({ onBeforeSupplyAdjustment, onAfterSupplyAdjustment }) => {
	const lastIndexedBlock = await getLastIndexedBlock();
	const lastIndexedSupplyHeight = await getLastIndexedSupplyHeightFromDB();

	if (
		lastIndexedSupplyHeight === undefined ||
		lastIndexedBlock === undefined ||
		lastIndexedBlock.height === lastIndexedSupplyHeight
	) {
		return;
	}

	// Determine direction of indexing (forward or backward)
	const fromHeight = Math.min(lastIndexedBlock.height, lastIndexedSupplyHeight);
	const toHeight = Math.max(lastIndexedBlock.height, lastIndexedSupplyHeight);

	const missingSupplyDiff = await getMissingTotalSupplyDiff(fromHeight, toHeight);
	if (missingSupplyDiff === BigInt(0)) return;

	if (onBeforeSupplyAdjustment && typeof onBeforeSupplyAdjustment === 'function') {
		await onBeforeSupplyAdjustment();
	}

	const isBlockDeletion = lastIndexedSupplyHeight > lastIndexedBlock.height;

	logger.info(
		`Found missing unindexed total supply of ${missingSupplyDiff} between height ${fromHeight}-${toHeight}`,
	);

	await adjustSupplyMethod(missingSupplyDiff, lastIndexedBlock, isBlockDeletion, undefined);

	// update blockFrequency config for future reference
	await setPreviousBlockFrequency();

	if (onAfterSupplyAdjustment && typeof onAfterSupplyAdjustment === 'function') {
		await onAfterSupplyAdjustment();
	}
};

module.exports = {
	initIndexedSupply,
	indexTokenSupply,
	getTotalSupplyFromDB,
	applySupplyDiff,
	getSupplyTokenID,
	registerSupplyIndexerOnTerminatedSignal,
	indexMissingTotalSupply,
	getSupplyIndexerBlockFrequency,
};
