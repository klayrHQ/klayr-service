const { Logger } = require('klayr-service-framework');
const { pauseIndexBlocksQueue, resumeIndexBlocksQueue } = require('../blockchainIndex');

const logger = Logger();

const onIndexerStoppedHook = async () => {
	// stopped hook could be implemented here
};

// NOTE: there are a limit of 10_000 ms timeout for broker stopped() execution time
const onIndexerStopped = async () => {
	logger.debug("indexer's broker stopped() will be executed...");
	const start = Date.now();

	await pauseIndexBlocksQueue();

	await onIndexerStoppedHook();

	await resumeIndexBlocksQueue();

	logger.debug(`onIndexerStopped executed successfully! Elapsed time: ${Date.now() - start}ms`);
};

module.exports = { onIndexerStopped };
