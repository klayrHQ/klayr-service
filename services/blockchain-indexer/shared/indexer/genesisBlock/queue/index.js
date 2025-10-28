const { Logger, Queue } = require('klayr-service-framework');
const { debounce } = require('lodash');

const logger = Logger();

const config = require('../../../../config');
const {
	indexGenesisTokenBalances,
	indexGenesisTokenLocked,
	indexGenesisTokenSupply,
	indexGenesisTokenEscrowed,
	indexGenesisTokenSupportAllTokens,
	indexGenesisTokenSupported,
} = require('./token');
const { indexGenesisAuthAccount } = require('./auth');

let indexGenesisBlockQueue;
let onWaitingDrained;

let totalGenesisJob = 0;
let waitingCount = 0;
let waitingEmptyFired = false;
let onWaitingDrainedInitialized = false;

const defaultOptions = {
	defaultJobOptions: {
		attempts: 5,
		timeout: 5 * 60 * 1000,
		removeOnComplete: true,
		removeOnFail: false,
		stackTraceLimit: 0,
	},
	settings: {},
};

function isWaitingDrained() {
	if (!onWaitingDrainedInitialized) return false;
	return waitingCount <= 0 && !waitingEmptyFired;
}

const checkWaitingDrained = async job => {
	// double check condition to ensure that we invoke onWaitingDrained when waiting job truly drained
	if (isWaitingDrained()) {
		waitingCount = 0;
		waitingEmptyFired = true;

		if (onWaitingDrained && typeof onWaitingDrained === 'function') {
			await onWaitingDrained(job);
		}

		indexGenesisBlockQueue.queue.removeListener('waiting', onJobWaiting);
		indexGenesisBlockQueue.queue.removeListener('active', onJobActive);
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

const getGenesisBlockQueueActiveCount = async () => {
	if (!indexGenesisBlockQueue) initGenesisBlockQueues();
	return await indexGenesisBlockQueue.queue.getActiveCount();
};

const initGenesisBlockQueues = async onDrained => {
	if (indexGenesisBlockQueue) return;

	indexGenesisBlockQueue = Queue(
		config.endpoints.cache,
		config.queue.indexGenesisBlock.name,
		indexGenesisBlock,
		config.queue.indexGenesisBlock.concurrency,
		defaultOptions,
	);

	onWaitingDrained = onDrained;

	const jobCount = await indexGenesisBlockQueue.queue.getJobCounts();
	waitingCount = jobCount.waiting;
	onWaitingDrainedInitialized = true;

	indexGenesisBlockQueue.queue.on('waiting', onJobWaiting);
	indexGenesisBlockQueue.queue.on('active', onJobActive);
};

const indexGenesisBlock = async job => {
	switch (job.data.method) {
		case 'indexGenesisTokenBalances':
			await indexGenesisTokenBalances(job.data.payload);
			break;
		case 'indexGenesisTokenLocked':
			await indexGenesisTokenLocked(job.data.payload);
			break;
		case 'indexGenesisTokenSupply':
			await indexGenesisTokenSupply(job.data.payload);
			break;
		case 'indexGenesisTokenEscrowed':
			await indexGenesisTokenEscrowed(job.data.payload);
			break;
		case 'indexGenesisTokenSupportAllTokens':
			await indexGenesisTokenSupportAllTokens(job.data.payload);
			break;
		case 'indexGenesisTokenSupported':
			await indexGenesisTokenSupported(job.data.payload);
			break;
		case 'indexGenesisAuthAccount':
			await indexGenesisAuthAccount(job.data.payload);
			break;
		default:
			throw new Error(`unknown genesis block job method: ${job.data.method}`);
	}

	const percent =
		totalGenesisJob > 0 ? Math.min(((Number(job.id) / totalGenesisJob) * 100).toFixed(1), 100) : 0;
	logger.info(
		`Successfully executed "${job.data.method}" — ${job.id}/${totalGenesisJob} (${percent}%)`,
	);
};

const addGenesisBlockJob = async (method, payload) => {
	await indexGenesisBlockQueue.add({ method, payload });
};

const cleanGenesisBlockQueue = async () => {
	try {
		await pauseGenesisBlocksQueue();
		await indexGenesisBlockQueue.queue.obliterate({ force: true });
		logger.info('Genesis blocks queue obliterated.');
	} catch (err) {
		logger.error('Failed to clean Genesis blocks queue:', err.message);
		throw err;
	} finally {
		await resumeGenesisBlocksQueue();
	}
};

const pauseGenesisBlocksQueue = async () => {
	if (indexGenesisBlockQueue && indexGenesisBlockQueue.queue) {
		await indexGenesisBlockQueue.queue.pause();
		logger.info('Genesis blocks queue is paused.');
	}
};

const resumeGenesisBlocksQueue = async () => {
	if (indexGenesisBlockQueue && indexGenesisBlockQueue.queue) {
		await indexGenesisBlockQueue.queue.resume();
		logger.info('Genesis blocks queue is resumed.');
	}
};

const initializeTotalGenesisJob = async () => {
	const count = await indexGenesisBlockQueue.queue.getJobCounts();
	Object.keys(count).forEach(key => (totalGenesisJob += count[key]));
};

module.exports = {
	initGenesisBlockQueues,
	addGenesisBlockJob,
	getGenesisBlockQueueActiveCount,
	cleanGenesisBlockQueue,
	pauseGenesisBlocksQueue,
	resumeGenesisBlocksQueue,
	initializeTotalGenesisJob,
};
