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
const {
	Logger,
	DB: {
		MySQL: { getTableInstance },
	},
	Signals,
} = require('klayr-service-framework');

const { getCurrentHeight, getGenesisHeight } = require('../constants');

const logger = Logger();

const blocksTableSchema = require('../database/schema/blocks');

const config = require('../../config');
const { stopIndexSpeedRecord } = require('../utils/indexSpeed');
const {
	getIndexerLastCurrentHeight,
	startIndexingPendingNewBlock,
	getNumBlocksIndexed,
	registerPendingIndexReadySignal,
} = require('./pendingBlockchainIndex');
const {
	getPendingIndexReady,
	setPendingIndexIsReady,
	getIndexReadyStatus,
	setIndexReadyStatus,
} = require('./readyIndex');
const { registerSupplyIndexerOnTerminatedSignal } = require('./supplyIndexer');
const { unregisterIndexerEvent } = require('./blockchainIndex');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getBlocksTable = () => getTableInstance(blocksTableSchema, MYSQL_ENDPOINT);

const getIndexStats = async () => {
	try {
		const blocksTable = await getBlocksTable();
		const currentChainHeight = await getCurrentHeight();
		const genesisHeight = await getGenesisHeight();
		const numBlocksIndexed = await blocksTable.count();
		const [lastIndexedBlock = {}] = await blocksTable.find({ sort: 'height:desc', limit: 1 }, [
			'height',
		]);
		const chainLength = currentChainHeight - genesisHeight + 1;
		const percentage = (Math.floor((numBlocksIndexed / chainLength) * 10000) / 100).toFixed(2);

		return {
			currentChainHeight,
			genesisHeight,
			numBlocksIndexed,
			lastIndexedBlock,
			chainLength,
			percentage,
		};
	} catch (err) {
		logger.warn(`Error while checking index readiness: ${err.message}`);
		return { error: true };
	}
};

const validateIndexReadiness = async ({ strict } = {}) => {
	const { numBlocksIndexed, chainLength } = await getIndexStats();
	const chainLenToConsider = strict === true ? chainLength : chainLength - 1;
	return numBlocksIndexed >= chainLenToConsider;
};

const checkIndexReadiness = async () => {
	if (
		!getIndexReadyStatus() && // status is set only once
		(await validateIndexReadiness())
	) {
		// last block is being indexed atm
		setIndexReadyStatus(true);
		logger.info('The blockchain index is complete.');
		logger.debug(`'blockIndexReady' signal: ${Signals.get('blockIndexReady')}`);

		Signals.get('blockIndexReady').dispatch(true);
		Signals.get('newBlock').remove(checkIndexReadiness);

		unregisterIndexerEvent();

		if (config.isBenchmarkingIndexing) stopIndexSpeedRecord();
	}
};

const checkIndexReadinessWithoutPendingIndex = async () => {
	const numBlocksIndexed = await getNumBlocksIndexed();
	const indexReadyStatus = getIndexReadyStatus();
	const lastCurrentHeight = getIndexerLastCurrentHeight();

	if (
		!indexReadyStatus &&
		numBlocksIndexed > 1 &&
		lastCurrentHeight !== -1 &&
		numBlocksIndexed >= lastCurrentHeight
	) {
		Signals.get('newBlock').remove(checkIndexReadinessWithoutPendingIndex);
		if (getPendingIndexReady()) return;

		setPendingIndexIsReady();
		await startIndexingPendingNewBlock(numBlocksIndexed);
	}

	// if this function still invoked after indexReadyStatus become true, then remove it
	if (indexReadyStatus) {
		Signals.get('newBlock').remove(checkIndexReadinessWithoutPendingIndex);
	}
};

const reportIndexStatus = async () => {
	const indexStats = await getIndexStats();
	const {
		currentChainHeight,
		numBlocksIndexed,
		lastIndexedBlock = {},
		chainLength,
		percentage,
	} = indexStats;

	Signals.get('indexStatUpdate').dispatch(indexStats);

	logger.info(
		[
			`currentChainHeight: ${currentChainHeight}`,
			`lastIndexedBlockHeight: ${lastIndexedBlock.height}`,
		].join(', '),
	);

	logger.info(
		`Block index status: ${numBlocksIndexed}/${chainLength} blocks indexed (${percentage}%).`,
	);
};

const init = async () => {
	// Register event listeners
	Signals.get('newBlock').add(checkIndexReadinessWithoutPendingIndex);
	Signals.get('newBlock').add(checkIndexReadiness);
	registerPendingIndexReadySignal();
	registerSupplyIndexerOnTerminatedSignal();

	// Initialize index status reporting and schedule regular updates
	await reportIndexStatus();
	setInterval(reportIndexStatus, 15 * 1000); // ms
};

module.exports = {
	getIndexReadyStatus,
	getIndexStats,
	init,
};
