const { Logger } = require('klayr-service-framework');

const logger = Logger();

let isIndexReady = false;
let pendingIndexReady = false;
let isScheduledThroughCoordinator = false;
let isOnWaitingDrainedBeenExecuted = false;

const getPendingIndexReady = () => pendingIndexReady;

const setPendingIndexIsReady = () => {
	if (!pendingIndexReady) {
		logger.trace('setPendingIndexIsReady is setting pendingIndexReady as true on readyIndex.js');
		pendingIndexReady = true;
	}
};

const getIndexReadyStatus = () => isIndexReady;

const setIndexReadyStatus = isReady => (isIndexReady = isReady);

const getIsSchedulingThroughCoordinator = () => isScheduledThroughCoordinator;

const setIsSchedulingThroughCoordinator = () => {
	if (!isScheduledThroughCoordinator) {
		logger.trace(
			'setIsSchedulingThroughCoordinator is setting isScheduledThroughCoordinator as true on readyIndex.js',
		);
		isScheduledThroughCoordinator = true;
	}
};

const getIsOnWaitingDrainedBeenExecuted = () => isOnWaitingDrainedBeenExecuted;

const setIsOnWaitingDrainedBeenExecuted = () => {
	if (!isOnWaitingDrainedBeenExecuted) {
		logger.trace(
			'setIsOnWaitingDrainedBeenExecuted is setting isOnWaitingDrainedBeenExecuted as true on readyIndex.js',
		);
		isOnWaitingDrainedBeenExecuted = true;
	}
};

module.exports = {
	getPendingIndexReady,
	setPendingIndexIsReady,
	getIndexReadyStatus,
	setIndexReadyStatus,
	getIsSchedulingThroughCoordinator,
	setIsSchedulingThroughCoordinator,
	getIsOnWaitingDrainedBeenExecuted,
	setIsOnWaitingDrainedBeenExecuted,
};
