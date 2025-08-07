const { Logger } = require('klayr-service-framework');
const { pauseIndexBlocksQueue } = require('../blockchainIndex');
const { applySupplyDiff } = require('../supplyIndexer');

const logger = Logger();

// NOTE: there are a limit of 10_000 ms timeout for broker stopped() execution time
const onIndexerStopped = async () => {
	logger.debug("indexer's broker stopped() will be executed...");
	const start = Date.now();

	await pauseIndexBlocksQueue();
	await applySupplyDiff();

	logger.debug(`onIndexerStopped executed successfully! Elapsed time: ${Date.now() - start}ms`);
};

module.exports = { onIndexerStopped };
