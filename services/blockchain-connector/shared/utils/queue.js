let queueInstance = null;

async function getQueueInstance({ concurrency }) {
	if (!queueInstance) {
		const PQueue = await import('p-queue');
		queueInstance = new PQueue.default({ concurrency });
	}
	return queueInstance;
}

module.exports = { getQueueInstance };
