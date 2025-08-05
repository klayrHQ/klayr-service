const { Logger } = require('klayr-service-framework');

const logger = Logger();

let isIndexReady = false;
let pendingIndexReady = false;

const getPendingIndexReady = () => pendingIndexReady;

const setPendingIndexIsReady = () => {
	if (!pendingIndexReady) {
		logger.trace('setPendingIndexIsReady is setting pendingIndexReady as true on readyIndex.js');
		pendingIndexReady = true;
	}
};

const getIndexReadyStatus = () => isIndexReady;

const setIndexReadyStatus = isReady => (isIndexReady = isReady);

module.exports = {
	getPendingIndexReady,
	setPendingIndexIsReady,
	getIndexReadyStatus,
	setIndexReadyStatus,
};
