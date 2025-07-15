const {
	DB: {
		MySQL: { getTableInstance },
	},
	Signals,
	Logger,
} = require('klayr-service-framework');
const { indexNewBlock } = require('./blockchainIndex');

const blocksTableSchema = require('../database/schema/blocks');
const config = require('../../config');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getBlocksTable = () => getTableInstance(blocksTableSchema, MYSQL_ENDPOINT);

const logger = Logger();

let indexReady = false;

let indexerLastCurrentHeight = -1;

const pendingBlockToIndex = [];

const getPendingIndexReady = () => indexReady;

const getPendingBlockToIndexLength = () => pendingBlockToIndex.length;

const getIndexerLastCurrentHeight = () => indexerLastCurrentHeight;

const setPendingIndexerLastCurrentHeight = height => {
	// only set this once
	if (indexerLastCurrentHeight === -1) {
		logger.trace(
			`setPendingIndexerLastCurrentHeight is setting indexerLastCurrentHeight as ${height} on pendingBlockchainIndex.js`,
		);
		indexerLastCurrentHeight = height;
	}
};

const setPendingIndexIsReady = () => {
	if (!indexReady) {
		logger.trace('setIndexIsReady is setting indexReady as true on pendingBlockchainIndex.js');
		indexReady = true;
	}
};

const getNumBlocksIndexed = async () => {
	const blocksTable = await getBlocksTable();
	return await blocksTable.count();
};

const startIndexingPendingNewBlock = async numBlocksIndexed => {
	logger.info('Start indexing pending blocks...');
	pendingBlockToIndex.sort((h1, h2) => h1.header.height - h2.header.height); // sort heights in ascending order

	const thereAreMissingBlocks = pendingBlockToIndex[0].header.height > numBlocksIndexed;

	for (let i = 0; i < pendingBlockToIndex.length; i++) {
		try {
			const block = pendingBlockToIndex[i];
			const skipMissingCheck = i === 0 ? !thereAreMissingBlocks : thereAreMissingBlocks;
			logger.trace(
				`Indexing pending block with id: ${block.header.id}` +
					(skipMissingCheck ? ' with skipCheckingMissingBlock configured to true' : ''),
			);
			await indexNewBlock(block, skipMissingCheck);
		} catch (err) {
			logger.error(
				`Failed to index pending block ${pendingBlockToIndex[i].header.id}: ${err.message}`,
			);
		}
	}

	pendingBlockToIndex.length = 0;
	logger.info('Indexing pending blocks completed, pendingBlockToIndex successfully cleared');
};

const indexPendingNewBlock = async block => {
	if (indexReady) {
		await indexNewBlock(block, true);
	} else {
		if (!pendingBlockToIndex.some(b => b.header.id === block.header.id)) {
			logger.info(
				`Block indexing is still in progress, block at height ${block.header.height} will be scheduled for indexing later...`,
			);
			pendingBlockToIndex.push(block);
		} else {
			logger.info(`Block at height ${block.header.height} is already pending for indexing.`);
		}
	}
};

const registerPendingIndexReadySignal = () => {
	const pendingIndexReadySignalListener = async () => {
		Signals.get('blockIndexReady').remove(pendingIndexReadySignalListener);
		if (indexReady) return;

		const numBlocksIndexed = await getNumBlocksIndexed();
		setPendingIndexIsReady();
		await startIndexingPendingNewBlock(numBlocksIndexed);
	};
	Signals.get('blockIndexReady').add(pendingIndexReadySignalListener);
};

module.exports = {
	indexPendingNewBlock,
	startIndexingPendingNewBlock,
	getPendingBlockToIndexLength,
	getIndexerLastCurrentHeight,
	setPendingIndexerLastCurrentHeight,
	setPendingIndexIsReady,
	getNumBlocksIndexed,
	registerPendingIndexReadySignal,
	getPendingIndexReady,
};
