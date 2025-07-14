const { Signals, Logger } = require('klayr-service-framework');
const { indexNewBlock } = require('./blockchainIndex');

const logger = Logger();

let indexReady = false;

const pendingBlockToIndex = [];

const setIndexIsReady = () => {
	if (!indexReady) {
		logger.trace('setIndexIsReady is setting indexReady as true on pendingBlockchainIndex.js');
		indexReady = true;
	}
};

const startIndexingPendingNewBlock = async () => {
	logger.info('Start indexing pending blocks...');
	for (const block of pendingBlockToIndex) {
		try {
			logger.trace(`Indexing pending block with id: ${block.header.id}`);
			await indexNewBlock(block);
		} catch (err) {
			logger.error(`Failed to index pending block ${block.header.id}: ${err.message}`);
		}
	}
	pendingBlockToIndex.length = 0;
	logger.info('Indexing pending blocks completed, pendingBlockToIndex successfully cleared');
};

const indexPendingNewBlock = async block => {
	if (indexReady) {
		await indexNewBlock(block);
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

const registerPendingNewBlockSignal = async () => {
	const indexPendingNewBlockReadyListener = async () => {
		logger.info('Removing pending new block signal');
		Signals.get('blockIndexReady').remove(indexPendingNewBlockReadyListener);
		setIndexIsReady();
		await startIndexingPendingNewBlock();
	};
	logger.info('Registering pending new block signal');
	Signals.get('blockIndexReady').add(indexPendingNewBlockReadyListener);
};

module.exports = { indexPendingNewBlock, registerPendingNewBlockSignal };
