/*
 * Klayrhq/klayrservice
 * Copyright © 2023 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
const BluebirdPromise = require('bluebird');

const {
	Logger,
	DB: {
		MySQL: {
			getTableInstance,
			KVStore: { getKeyValueTable },
		},
	},
	CacheLRU,
} = require('klayr-service-framework');

const { KV_STORE_KEY } = require('../../constants');
const { getLastIndexedBlock } = require('../lastIndexedBlock');

const config = require('../../../config');

const blocksTableSchema = require('../../database/schema/blocks');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const logger = Logger();

const getBlocksTable = () => getTableInstance(blocksTableSchema, MYSQL_ENDPOINT);

const keyValueTable = getKeyValueTable();

const LARGEST_MISSING_BLOCK_HEIGHT_CACHE_KEY = 'largestMissingBlockHeight';

const largestMissingBlockHeightCache = CacheLRU('largestMissingBlockHeight', { max: 1 });

let isReorderingIndexBlocksQueueMode = false;

let blocksToBeReordered = [];

const getReorderingStatus = () => isReorderingIndexBlocksQueueMode;

const setLargestMissingBlockHeight = async missingBlockHeight => {
	await largestMissingBlockHeightCache.set(
		LARGEST_MISSING_BLOCK_HEIGHT_CACHE_KEY,
		missingBlockHeight,
	);
};

const getLargestMissingBlockHeight = async () => {
	const largestMissingBlockHeight = await largestMissingBlockHeightCache.get(
		LARGEST_MISSING_BLOCK_HEIGHT_CACHE_KEY,
	);
	if (largestMissingBlockHeight === undefined) {
		const lastIndexedBlock = await getLastIndexedBlock();
		return lastIndexedBlock.height;
	}
	return largestMissingBlockHeight;
};

const createMissingBlockArray = (lastIndexedBlockHeight, newBlockHeight) => {
	const result = [];
	for (let i = lastIndexedBlockHeight + 1; i < newBlockHeight; i++) {
		result.push(i);
	}
	return result;
};

const fillMissingHeights = async blocks => {
	const completeBlockDataResult = [];

	// map is used for fast lookup, and set is used to avoid duplicates
	const insertedHeights = new Set();
	const heightMap = new Map();

	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i];
		heightMap.set(block.header.height, block);
	}

	const sortedHeights = Array.from(heightMap.keys()).sort((a, b) => a - b);
	const minHeight = sortedHeights[0];
	const maxHeight = sortedHeights[sortedHeights.length - 1];

	for (let h = minHeight; h <= maxHeight; h++) {
		if (insertedHeights.has(h)) continue;

		if (heightMap.has(h)) {
			completeBlockDataResult.push(heightMap.get(h));
		} else {
			logger.warn(`Missing block at height ${h}, fetching data from node.`);
			const fetchedMissingBlock = await requestConnector('getBlockByHeight', { height: h });
			completeBlockDataResult.push(fetchedMissingBlock);
		}

		insertedHeights.add(h);
	}

	return completeBlockDataResult;
};

const indexNewMissingBlock = async (lastIndexedBlock, newBlock, queue) => {
	const blocksTable = await getBlocksTable();
	const missingBlocks = createMissingBlockArray(lastIndexedBlock.height, newBlock.header.height);

	// largestMissingBlock is tracked to prevent re-queuing missing block
	const largestMissingBlockHeight = await getLargestMissingBlockHeight();
	let currentLargestMissingBlockHeight = largestMissingBlockHeight;

	for (const missingBlockHeight of missingBlocks) {
		if (missingBlockHeight > currentLargestMissingBlockHeight) {
			logger.info(`Scheduling indexing of missing block at height ${missingBlockHeight}`);

			const [blockFromDB] = await blocksTable.find({ height: missingBlockHeight, limit: 1 }, [
				'id',
			]);

			if (!blockFromDB) {
				currentLargestMissingBlockHeight = missingBlockHeight;
				await queue.add({ height: missingBlockHeight });
			} else {
				logger.info(`Block at height ${missingBlockHeight} already indexed`);
			}
		}
	}

	if (currentLargestMissingBlockHeight)
		await setLargestMissingBlockHeight(currentLargestMissingBlockHeight);
};

const reorderIndexBlocksQueueJobs = async (job, queue) => {
	activateReorderingMode();
	if (!job && !job.data && !job.data.block) throw new Error('invalid job to be reordered');

	logger.info(
		`Reordering index blocks queue jobs for block at height ${job.data.block.header.height}`,
	);
	blocksToBeReordered.push(job.data.block);

	const jobCount = await queue.queue.getJobCounts();
	if (jobCount.waiting === 0) {
		logger.info('indexBlocksQueue waiting job is empty, start adding reordered blocks to queue');

		blocksToBeReordered.sort((a, b) => a.header.height - b.header.height);

		blocksToBeReordered = await fillMissingHeights(blocksToBeReordered);

		const lastIndexedBlock = await getLastIndexedBlock();
		if (lastIndexedBlock.height !== blocksToBeReordered[0].header.height - 1) {
			logger.info(
				`Last indexed block height ${lastIndexedBlock.height} does not match the first block to be reordered at height ${blocksToBeReordered[0].header.height}. Re-indexing missing block...`,
			);
			await indexNewMissingBlock(lastIndexedBlock, blocksToBeReordered[0], queue);
		}

		logger.info(
			`Adding reordered blocks from height ${blocksToBeReordered[0].header.height} until ${
				blocksToBeReordered[blocksToBeReordered.length - 1].header.height
			} to indexBlocksQueue...`,
		);

		for (let i = 0; i < blocksToBeReordered.length; i++) {
			logger.debug(`Adding block at height ${blocksToBeReordered[i].header.height} to queue`);
			await queue.add({ block: blocksToBeReordered[i] });
		}

		logger.info(
			`Reordering index blocks queue jobs from height ${
				blocksToBeReordered[0].header.height
			} until ${blocksToBeReordered[blocksToBeReordered.length - 1].header.height} completed`,
		);
		blocksToBeReordered = [];
		deactivateReorderingMode();
	}
};

const activateReorderingMode = () => {
	if (!isReorderingIndexBlocksQueueMode) {
		logger.info('Activating reordering index blocks queue mode');
		isReorderingIndexBlocksQueueMode = true;
	}
};

const deactivateReorderingMode = () => {
	if (isReorderingIndexBlocksQueueMode) {
		logger.info('Deactivating reordering index blocks queue mode');
		isReorderingIndexBlocksQueueMode = false;
	}
};

const updateTotalLockedAmounts = async (tokenIDLockedAmountChangeMap, dbTrx) =>
	BluebirdPromise.map(
		Object.entries(tokenIDLockedAmountChangeMap),
		async ([tokenID, lockedAmountChange]) => {
			const tokenKey = KV_STORE_KEY.PREFIX.TOTAL_LOCKED.concat(tokenID);
			const curLockedAmount = BigInt((await keyValueTable.get(tokenKey)) || 0);
			const newLockedAmount = curLockedAmount + lockedAmountChange;

			await keyValueTable.set(tokenKey, newLockedAmount, dbTrx);
		},
		{ concurrency: Object.entries(tokenIDLockedAmountChangeMap).length },
	);

module.exports = {
	reorderIndexBlocksQueueJobs,
	activateReorderingMode,
	updateTotalLockedAmounts,
	getReorderingStatus,
	createMissingBlockArray,
	setLargestMissingBlockHeight,
	getLargestMissingBlockHeight,
	indexNewMissingBlock,
};
