const { Logger } = require('klayr-service-framework');
const {
	pauseIndexBlocksQueue,
	resumeIndexBlocksQueue,
	isIndexBlocksQueuePaused,
} = require('../blockchainIndex');

const logger = Logger();

const onIndexerStoppedHook = async () => {
	// stopped hook could be implemented here
};

// NOTE: there are a limit of 10_000 ms timeout for broker stopped() execution time
const onIndexerStopped = async () => {
	logger.debug("indexer's broker stopped() will be executed...");
	const start = Date.now();
	const isPaused = await isIndexBlocksQueuePaused();

	if (!isPaused) await pauseIndexBlocksQueue();

	await onIndexerStoppedHook();

	if (!isPaused) await resumeIndexBlocksQueue();

	logger.debug(`onIndexerStopped executed successfully! Elapsed time: ${Date.now() - start}ms`);
};

module.exports = { onIndexerStopped };
