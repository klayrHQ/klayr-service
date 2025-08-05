let waitingCount = 0;
let waitingEmptyFired = false;

// This hook is called when the queue is drained and there are no more jobs waiting
async function onWaitingDrained() {
	/* … */
}

async function onJobWaiting(job) {
	waitingCount++;
	waitingEmptyFired = false;
}

async function onJobActive(job) {
	waitingCount--;
	if (waitingCount === 0 && !waitingEmptyFired) {
		waitingEmptyFired = true;
		await onWaitingDrained();
	}
}

function registerIndexerEventHook(indexBlocksQueue) {
	indexBlocksQueue.queue.on('waiting', onJobWaiting);
	indexBlocksQueue.queue.on('active', onJobActive);
}

function unregisterIndexerEventHook(indexBlocksQueue) {
	indexBlocksQueue.queue.removeListener('waiting', onJobWaiting);
	indexBlocksQueue.queue.removeListener('active', onJobActive);
}

module.exports = { registerIndexerEventHook, unregisterIndexerEventHook };
