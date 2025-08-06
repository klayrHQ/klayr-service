const { Logger } = require('klayr-service-framework');

let blocksIndexedThisSecond = 0;
let maxThroughput = 0;
let indexingSpeedInterval = null;
let isEnded = false;

const logger = Logger();

const startIndexSpeedRecord = () => {
	if (!indexingSpeedInterval && !isEnded) {
		indexingSpeedInterval = setInterval(() => {
			logger.info(
				`Block Indexing Speed - Current throughput: ${blocksIndexedThisSecond} blocks/sec, Maximum achieved throughput: ${maxThroughput} blocks/sec`,
			);
			if (blocksIndexedThisSecond > maxThroughput) {
				maxThroughput = blocksIndexedThisSecond;
			}
			blocksIndexedThisSecond = 0;
		}, 1000);
	}
};

const increaseBlockIndexedForSpeedRecord = () => {
	if (indexingSpeedInterval) blocksIndexedThisSecond++;
};

const stopIndexSpeedRecord = () => {
	if (indexingSpeedInterval) {
		clearInterval(indexingSpeedInterval);
		isEnded = true;
		indexingSpeedInterval = null;
		logger.info(
			`Block Indexing Speed - Ended: Maximum achieved throughput: ${maxThroughput} blocks/sec`,
		);
	}
};

module.exports = {
	startIndexSpeedRecord,
	increaseBlockIndexedForSpeedRecord,
	stopIndexSpeedRecord,
};
