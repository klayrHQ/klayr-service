const { Logger } = require('klayr-service-framework');
const { getIndexReadyStatus, getIsSchedulingThroughCoordinator } = require('../readyIndex');
const { scheduleMissingBlocksIndexing, getReorderingStatus } = require('./blockchainIndex');
const { debounce } = require('lodash');
const { getGenesisHeight } = require('../../constants');

const logger = Logger();

let waitingCount = 0;
let waitingEmptyFired = false;

// This hook is called when the queue is drained and there are no more jobs waiting
async function onWaitingDrained(currentBlock) {
	const indexReady = getIndexReadyStatus();
	const isScheduledThroughCoordinator = getIsSchedulingThroughCoordinator();
	const isReordering = getReorderingStatus();
	const genesisHeight = await getGenesisHeight();

	// only schedule missing blocks indexing if the index is not ready, not scheduled through coordinator,
	// is not reordering, and the current block height is greater than genesis height
	if (
		!indexReady &&
		!isScheduledThroughCoordinator &&
		!isReordering &&
		currentBlock.header.height > genesisHeight
	) {
		logger.info('Scheduling missing blocks indexing, since waiting queue is drained');
		await scheduleMissingBlocksIndexing();
	}
}

const checkWaitingDrained = async job => {
	// double check condition to ensure that we invoke onWaitingDrained when waiting job truly drained
	if (waitingCount <= 0 && !waitingEmptyFired) {
		waitingCount = 0;
		waitingEmptyFired = true;
		await onWaitingDrained(job.data.block);
	}
};

const debouncedCheckWaitingDrained = debounce(checkWaitingDrained, 5000);

async function onJobWaiting(job) {
	waitingCount++;
	waitingEmptyFired = false;
}

async function onJobActive(job) {
	waitingCount--;
	if (waitingCount <= 0 && !waitingEmptyFired) await debouncedCheckWaitingDrained(job);
}

async function registerIndexerEventHook(indexBlocksQueue) {
	const jobCount = await indexBlocksQueue.queue.getJobCounts();
	waitingCount = jobCount.waiting;

	indexBlocksQueue.queue.on('waiting', onJobWaiting);
	indexBlocksQueue.queue.on('active', onJobActive);
}

function unregisterIndexerEventHook(indexBlocksQueue) {
	waitingCount = 0;
	waitingEmptyFired = false;

	indexBlocksQueue.queue.removeListener('waiting', onJobWaiting);
	indexBlocksQueue.queue.removeListener('active', onJobActive);
}

module.exports = { registerIndexerEventHook, unregisterIndexerEventHook };
