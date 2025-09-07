let PQueue;

async function importPQueue() {
	if (!PQueue) {
		PQueue = await import('p-queue');
	}
	return PQueue;
}

async function createQueueInstance(concurrency) {
	const pQueue = await importPQueue();
	return new pQueue.default({ concurrency });
}

module.exports = { createQueueInstance };
