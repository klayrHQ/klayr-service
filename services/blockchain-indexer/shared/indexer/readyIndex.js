const { Logger } = require('klayr-service-framework');

const logger = Logger();

let indexReady = false;

const getPendingIndexReady = () => indexReady;

const setPendingIndexIsReady = () => {
	if (!indexReady) {
		logger.trace('setPendingIndexIsReady is setting indexReady as true on readyIndex.js');
		indexReady = true;
	}
};

module.exports = { getPendingIndexReady, setPendingIndexIsReady };
