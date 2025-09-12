const { debounce } = require('lodash');
const { scheduleMissingBlocks } = require('./scheduler');

let waitingCount = 0;
let waitingEmptyFired = false;
let onWaitingDrainedInitialized = false;

// This hook is called when the queue is drained and there are no more jobs waiting
async function onWaitingDrained(currentBlock) {
	await scheduleMissingBlocks(currentBlock);
}

function isWaitingDrained() {
	if (!onWaitingDrainedInitialized) return false;
	return waitingCount <= 0 && !waitingEmptyFired;
}

const checkWaitingDrained = async job => {
	// double check condition to ensure that we invoke onWaitingDrained when waiting job truly drained
	if (isWaitingDrained()) {
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
	if (isWaitingDrained()) await debouncedCheckWaitingDrained(job);
}

async function registerIndexerEventHook(indexBlocksQueue) {
	const jobCount = await indexBlocksQueue.queue.getJobCounts();
	waitingCount = jobCount.waiting;
	onWaitingDrainedInitialized = true;

	indexBlocksQueue.queue.on('waiting', onJobWaiting);
	indexBlocksQueue.queue.on('active', onJobActive);
}

function unregisterIndexerEventHook(indexBlocksQueue) {
	waitingCount = 0;
	waitingEmptyFired = false;

	indexBlocksQueue.queue.removeListener('waiting', onJobWaiting);
	indexBlocksQueue.queue.removeListener('active', onJobActive);
}

module.exports = { registerIndexerEventHook, unregisterIndexerEventHook, isWaitingDrained };
