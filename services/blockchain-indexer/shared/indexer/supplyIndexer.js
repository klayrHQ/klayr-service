const {
	DB: {
		MySQL: { getTableInstance },
	},
	Logger,
} = require('klayr-service-framework');
const { requestConnector } = require('../utils/request');
const { getPendingIndexReady } = require('./readyIndex');
const { MODULE, MODULE_SUB_STORE } = require('../constants');

const tokenSummaryTableSchema = require('../database/schema/tokenSummary');

const config = require('../../config');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const logger = Logger();

const getTokenSummaryTable = () => getTableInstance(tokenSummaryTableSchema, MYSQL_ENDPOINT);

let supplyTokenID;
let supplyDiff = BigInt(0);

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

const indexTokenSupply = async (indexedTotalSupply, isBlockDeletion) => {
	if (typeof indexedTotalSupply !== 'bigint')
		throw new Error(`indexTokenSupply assigned indexedTotalSupply is not bigint`);

	if (indexedTotalSupply === BigInt(0)) return;

	const absSupply =
		indexedTotalSupply < BigInt(0) ? indexedTotalSupply * BigInt(-1) : indexedTotalSupply;

	if (isBlockDeletion) {
		if (indexedTotalSupply > BigInt(0)) {
			await decreaseIndexedSupply(absSupply);
		} else {
			await increaseIndexedSupply(absSupply);
		}
	} else {
		if (indexedTotalSupply > BigInt(0)) {
			await increaseIndexedSupply(absSupply);
		} else {
			await decreaseIndexedSupply(absSupply);
		}
	}
};

const applySupplyDiff = async () => {
	logger.debug('Start indexing supply diff to token total supply...');

	if (supplyDiff > BigInt(0)) {
		const addedSupply = supplyDiff;
		supplyDiff = BigInt(0);
		logger.debug(`Applying supplyDiff of ${addedSupply} by increasing total supply`);
		await increaseIndexedSupply(addedSupply, true);
	}

	if (supplyDiff < BigInt(0)) {
		const removedSupply = supplyDiff * BigInt(-1);
		supplyDiff = BigInt(0);
		logger.debug(`Applying supplyDiff of ${removedSupply} by decreasing total supply`);
		await decreaseIndexedSupply(removedSupply, true);
	}

	logger.debug('Indexing supply diff completed, supplyDiff successfully cleared');
};

const increaseIndexedSupply = async (addedSupply, force = false) => {
	if (typeof addedSupply !== 'bigint')
		throw new Error(`increaseIndexedSupply assigned addedSupply is not bigint`);

	const indexReady = getPendingIndexReady();
	if (force || indexReady) {
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

const decreaseIndexedSupply = async (removedSupply, force = false) => {
	if (typeof removedSupply !== 'bigint')
		throw new Error(`decreaseIndexedSupply assigned removedSupply is not bigint`);

	const indexReady = getPendingIndexReady();
	if (force || indexReady) {
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
