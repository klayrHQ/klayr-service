const {
	DB: {
		MySQL: { getTableInstance },
	},
	Signals,
	Queue,
	CacheRedis,
	Logger,
} = require('klayr-service-framework');
const { indexNewBlock } = require('./blockchainIndex');

const blocksTableSchema = require('../database/schema/blocks');
const config = require('../../config');
const {
	getPendingIndexReady,
	setPendingIndexIsReady,
	getIsOnWaitingDrainedBeenExecuted,
} = require('./readyIndex');
const { isWaitingDrained } = require('./utils/indexerEventHook');
const {
	shouldScheduleMissingBlocks,
	scheduleMissingBlocksOnCoordinator,
} = require('./utils/scheduler');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const LAST_PENDING_BLOCK_CACHE = 'lastPendingBlock';
const LAST_PENDING_BLOCK_KEY = 'lastPendingBlock';
const lastPendingBlockCache = CacheRedis(LAST_PENDING_BLOCK_CACHE, config.endpoints.cache);

const FIRST_PENDING_BLOCK_CACHE = 'firstPendingBlock';
const FIRST_PENDING_BLOCK_KEY = 'firstPendingBlock';
const firstPendingBlockCache = CacheRedis(FIRST_PENDING_BLOCK_CACHE, config.endpoints.cache);

const getBlocksTable = () => getTableInstance(blocksTableSchema, MYSQL_ENDPOINT);

const logger = Logger();

let indexerLastCurrentHeight = -1;

let numBlocksIndexedValue = 0;

let firstPendingBlockJSON;

const getFirstPendingBlock = async () => {
	if (!firstPendingBlockJSON) {
		const firstPendingBlock = await firstPendingBlockCache.get(FIRST_PENDING_BLOCK_KEY);
		if (firstPendingBlock) firstPendingBlockJSON = JSON.parse(firstPendingBlock);
	}

	return firstPendingBlockJSON;
};

const indexPendingNewBlockWorker = async job => {
	const { block } = job.data;

	const firstPendingBlock = await getFirstPendingBlock();
	const thereAreMissingBlocks = firstPendingBlock
		? firstPendingBlock.header.height > numBlocksIndexedValue
		: true;

	try {
		const skipMissingCheck =
			firstPendingBlock && block.header.id === firstPendingBlock.header.id
				? !thereAreMissingBlocks
				: thereAreMissingBlocks;
		logger.trace(
			`Indexing pending block with id: ${block.header.id}` +
				(skipMissingCheck ? ' with skipCheckingMissingBlock configured to true' : ''),
		);
		await indexNewBlock(block, skipMissingCheck);
	} catch (err) {
		logger.error(`Failed to index pending block ${block.header.id}: ${err.message}`);
	}
};

const pendingBlocksQueue = Queue(
	config.endpoints.cache,
	config.queue.pendingBlocks.name,
	indexPendingNewBlockWorker,
	config.queue.pendingBlocks.concurrency,
);

const getIndexerLastCurrentHeight = () => indexerLastCurrentHeight;

const setPendingIndexerLastCurrentHeight = height => {
	logger.trace(
		`setPendingIndexerLastCurrentHeight is setting indexerLastCurrentHeight as ${height} on pendingBlockchainIndex.js`,
	);
	indexerLastCurrentHeight = height;
};

const getNumBlocksIndexed = async () => {
	const blocksTable = await getBlocksTable();
	return Number(await blocksTable.count());
};

const startIndexingPendingNewBlock = async numBlocksIndexed => {
	if (await pendingBlocksQueue.queue.isPaused()) {
		logger.info('Start scheduling indexing pending blocks...');

		numBlocksIndexedValue = numBlocksIndexed;
		await pendingBlocksQueue.queue.resume();

		logger.info('Scheduling indexing pending blocks completed');
	}
};

const indexPendingNewBlock = async block => {
	if (getPendingIndexReady()) {
		await indexNewBlock(block);
	} else {
		const isIndexingQueueDrained = isWaitingDrained();
		const isOnWaitingDrainedBeenExecuted = getIsOnWaitingDrainedBeenExecuted();

		if (isIndexingQueueDrained && !isOnWaitingDrainedBeenExecuted) {
			if (await shouldScheduleMissingBlocks(block)) {
				logger.info(
					`Scheduling missing blocks indexing, since indexPendingNewBlock catching onWaitingDrained hasn't been executed`,
				);
				await scheduleMissingBlocksOnCoordinator();
				return;
			}
		}

		await addPendingNewBlock(block);
	}
};

const addPendingNewBlock = async block => {
	if (!(await pendingBlocksQueue.queue.isPaused())) {
		await pendingBlocksQueue.queue.pause();
	}

	const firstPendingBlock = await getFirstPendingBlock();
	if (!firstPendingBlock) {
		await firstPendingBlockCache.set(FIRST_PENDING_BLOCK_KEY, JSON.stringify(block));
	}

	const lastPendingBlock = await lastPendingBlockCache.get(LAST_PENDING_BLOCK_KEY);
	if (lastPendingBlock) {
		const lastPendingBlockJSON = JSON.parse(lastPendingBlock);
		if (lastPendingBlockJSON.header.height < block.header.height) {
			await lastPendingBlockCache.set(LAST_PENDING_BLOCK_KEY, JSON.stringify(block));
		}
	} else {
		await lastPendingBlockCache.set(LAST_PENDING_BLOCK_KEY, JSON.stringify(block));
	}

	logger.info(
		`Block indexing is still in progress, block at height ${block.header.height} will be scheduled for indexing later...`,
	);
	await pendingBlocksQueue.queue.add(
		config.queue.pendingBlocks.name,
		{ block },
		{ jobId: block.header.id },
	);
};

const registerPendingIndexReadySignal = () => {
	const pendingIndexReadySignalListener = async () => {
		Signals.get('blockIndexReady').remove(pendingIndexReadySignalListener);
		if (getPendingIndexReady()) return;

		const numBlocksIndexed = await getNumBlocksIndexed();
		setPendingIndexIsReady();
		await startIndexingPendingNewBlock(numBlocksIndexed);
	};
	Signals.get('blockIndexReady').add(pendingIndexReadySignalListener);
};

module.exports = {
	indexPendingNewBlock,
	startIndexingPendingNewBlock,
	getIndexerLastCurrentHeight,
	setPendingIndexerLastCurrentHeight,
	getNumBlocksIndexed,
	registerPendingIndexReadySignal,
};
