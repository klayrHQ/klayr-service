/*
 * LiskHQ/lisk-service
 * Copyright © 2022 Lisk Foundation
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
const {
	Logger,
	Queue,
} = require('lisk-service-framework');

const BluebirdPromise = require('bluebird');

const logger = Logger();

const config = require('../../config');

const {
	getBlockByHeight,
	getVotesByTransactionIDs,
	getTransactionsByBlockIDs,
	getAccountsByPublicKey,
} = require('../dataService');

const {
	getBase32AddressFromPublicKey,
} = require('../utils/accountUtils');

const {
	range,
} = require('../utils/arrayUtils');

const {
	getTransactionIndexingInfo,
} = require('./transactionIndex');

const {
	getFinalizedHeight,
	getCurrentHeight,
	getGenesisHeight,
} = require('../constants');

const {
	getDbConnection,
	getTableInstance,
	startDbTransaction,
	commitDbTransaction,
	rollbackDbTransaction,
} = require('../database/mysql');

const blocksIndexSchema = require('../database/schema/blocks');
const accountsIndexSchema = require('../database/schema/accounts');
const transactionsIndexSchema = require('../database/schema/transactions');
const votesIndexSchema = require('../database/schema/votes');

const getAccountsIndex = () => getTableInstance('accounts', accountsIndexSchema);
const getBlocksIndex = () => getTableInstance('blocks', blocksIndexSchema);
const getTransactionsIndex = () => getTableInstance('transactions', transactionsIndexSchema);
const getVotesIndex = () => getTableInstance('votes', votesIndexSchema);

const validateBlocks = (blocks) => blocks.length
	&& blocks.every(block => !!block && block.height >= 0);

const getGeneratorPkInfoArray = async (blocks) => {
	const blocksDB = await getBlocksIndex();
	const pkInfoArray = [];
	await BluebirdPromise.map(
		blocks,
		async block => {
			if (block.generatorPublicKey) {
				const [blockInfo] = await blocksDB.find({ id: block.id, limit: 1 }, ['id']);
				pkInfoArray.push({
					publicKey: block.generatorPublicKey,
					reward: block.reward,
					isForger: true,
					isBlockIndexed: !!blockInfo,
				});
			}
		},
		{ concurrency: blocks.length },
	);
	return pkInfoArray;
};

const indexBlock = async job => {
	const { height } = job.data;

	const blocksDB = await getBlocksIndex();
	const blocks = await getBlockByHeight(height);
	const connection = await getDbConnection();
	const trx = await startDbTransaction(connection);

	logger.debug(`Created new MySQL transaction to index block at height ${height}`);

	if (!validateBlocks(blocks)) throw new Error(`Error: Invalid block ${height} }`);
	try {
		const transactionsDB = await getTransactionsIndex();
		const transactions = await getTransactionIndexingInfo(blocks);
		if (transactions.length) await transactionsDB.upsert(transactions, trx);
		if (blocks.length) await blocksDB.upsert(blocks, trx);

		await commitDbTransaction(trx);
	} catch (error) {
		await rollbackDbTransaction(trx);
		logger.debug(`Rolled back MySQL transaction to index block at height ${height}`);

		if (error.message.includes('ER_LOCK_DEADLOCK')) {
			throw new Error(`Deadlock encountered while indexing blocks in height range ${height}. Will retry later.`);
		}
		throw error;
	}
};

const updateBlockIndex = async job => {
	const blocksDB = await getBlocksIndex();
	const { blocks } = job.data;
	await blocksDB.upsert(blocks);
};

const deleteIndexedBlocks = async job => {
	const blocksDB = await getBlocksIndex();
	const connection = await getDbConnection();
	const trx = await startDbTransaction(connection);
	try {
		const accountsDB = await getAccountsIndex();
		const transactionsDB = await getTransactionsIndex();
		const votesDB = await getVotesIndex();
		const { blocks } = job.data;
		const generatorPkInfoArray = await getGeneratorPkInfoArray(blocks);
		const accountsByPublicKey = await getAccountsByPublicKey(generatorPkInfoArray);
		if (accountsByPublicKey.length) await accountsDB.upsert(accountsByPublicKey, trx);
		const forkedTransactionIDs = await getTransactionsByBlockIDs(blocks.map(b => b.id));
		const forkedVotes = await getVotesByTransactionIDs(forkedTransactionIDs);
		await transactionsDB.deleteIds(forkedTransactionIDs, trx);
		await votesDB.deleteIds(forkedVotes.map(v => v.tempId), trx);

		// Update producedBlocks & rewards
		await BluebirdPromise.map(
			generatorPkInfoArray,
			async pkInfoArray => {
				await accountsDB.decrement({
					decrement: {
						rewards: BigInt(pkInfoArray.reward),
						producedBlocks: 1,
					},
					where: {
						property: 'address',
						value: getBase32AddressFromPublicKey(pkInfoArray.publicKey),
					},
				}, trx);
			});
		await blocksDB.deleteIds(blocks.map(b => b.height), trx);
		await commitDbTransaction(trx);
	} catch (error) {
		await rollbackDbTransaction(trx);
		throw error;
	}
};

// Initialize queues
const indexBlocksQueue = Queue(config.endpoints.cache, 'indexBlocksQueue', indexBlock, 30);
const updateBlockIndexQueue = Queue(config.endpoints.cache, 'updateBlockIndexQueue', updateBlockIndex, 1);
const deleteIndexedBlocksQueue = Queue(config.endpoints.cache, 'deleteIndexedBlocksQueue', deleteIndexedBlocks, 1);

const deleteBlock = async (block) => deleteIndexedBlocksQueue.add({ blocks: [block] });

const indexNewBlock = async height => {
	const blocksDB = await getBlocksIndex();
	const [block] = await getBlockByHeight(height);
	logger.info(`Indexing new block: ${block.id} at height ${block.height}`);

	const [blockInfo] = await blocksDB.find({ height: block.height, limit: 1 }, ['id', 'isFinal']);
	if (!blockInfo || (!blockInfo.isFinal && block.isFinal)) {
		// Index if doesn't exist, or update if it isn't set to final
		await indexBlocksQueue.add({ height: block.height });

		// Update block finality status
		const finalizedBlockHeight = await getFinalizedHeight();
		const nonFinalBlocks = await blocksDB.find({ isFinal: false, limit: 1000 },
			Object.keys(blocksIndexSchema.schema));
		await updateBlockIndexQueue.add({
			blocks: nonFinalBlocks
				.filter(b => b.height <= finalizedBlockHeight)
				.map(b => ({ ...b, isFinal: true })),
		});

		if (blockInfo && blockInfo.id !== block.id) {
			// Fork detected

			const [highestIndexedBlock] = await blocksDB.find({ sort: 'height:desc', limit: 1 }, ['height']);
			const blocksToRemove = await blocksDB.find({
				propBetweens: [{
					property: 'height',
					from: block.height + 1,
					to: highestIndexedBlock.height,
				}],
				limit: highestIndexedBlock.height - block.height,
			}, ['id']);
			await deleteIndexedBlocksQueue.add({ blocks: blocksToRemove });
		}
	}
};

const buildIndex = async (from, to) => {
	if (from > to) {
		logger.warn(`Invalid interval of blocks to index: ${from} -> ${to}`);
		return;
	}

	const MAX_BLOCKS_LIMIT_PP = 1; // 1 block at a time
	const numOfPages = Math.ceil((to + 1) / MAX_BLOCKS_LIMIT_PP - from / MAX_BLOCKS_LIMIT_PP);

	for (let pageNum = 0; pageNum < numOfPages; pageNum++) {
		/* eslint-disable no-await-in-loop */
		const pseudoOffset = to - (MAX_BLOCKS_LIMIT_PP * (pageNum + 1));
		const offset = pseudoOffset >= from ? pseudoOffset : from - 1;
		const batchFromHeight = offset + 1;
		const batchToHeight = (offset + MAX_BLOCKS_LIMIT_PP) <= to
			? (offset + MAX_BLOCKS_LIMIT_PP) : to;
		const percentage = (((pageNum + 1) / numOfPages) * 100).toFixed(1);
		logger.debug(`Scheduling retrieval of blocks ${batchFromHeight}-${batchToHeight} (${percentage}%)`);

		for (let height = batchFromHeight; height <= batchToHeight; height++) {
			await indexBlocksQueue.add({ height });
		}
		/* eslint-enable no-await-in-loop */
	}
	logger.info(`Finished scheduling the block index build (${from}-${to})`);
};

const findMissingBlocksInRange = async (fromHeight, toHeight) => {
	let result = [];

	const totalNumOfBlocks = toHeight - fromHeight + 1;
	logger.info(`Checking for missing blocks between height ${fromHeight}-${toHeight} (${totalNumOfBlocks} blocks)`);

	const blocksDB = await getBlocksIndex();
	const propBetweens = [{
		property: 'height',
		from: fromHeight,
		to: toHeight,
	}];
	const indexedBlockCount = await blocksDB.count({ propBetweens });

	// This block helps determine empty index
	if (indexedBlockCount < 3) {
		result = [{ from: fromHeight, to: toHeight }];
	} else if (indexedBlockCount !== totalNumOfBlocks) {
		const missingBlocksQueryStatement = `
			SELECT
				(SELECT COALESCE(MAX(b0.height), ${fromHeight}) FROM blocks b0 WHERE b0.height < b1.height) AS 'from',
				(b1.height - 1) AS 'to'
			FROM blocks b1
			WHERE b1.height BETWEEN ${fromHeight} + 1 AND ${toHeight}
				AND b1.height != ${toHeight}
				AND NOT EXISTS (SELECT 1 FROM blocks b2 WHERE b2.height = b1.height - 1)
		`;

		const missingBlockRanges = await blocksDB.rawQuery(missingBlocksQueryStatement);

		result = missingBlockRanges;
	}

	const logContent = result.map(o => `${o.from}-${o.to} (${o.to - o.from + 1} blocks)`);
	logContent.forEach(o => logger.info(`Missing blocks in range: ${o}`));

	return result;
};

const getNonFinalHeights = async () => {
	const blocksDB = await getBlocksIndex();

	const [{ height: lastIndexedHeight } = {}] = await blocksDB.find({
		sort: 'height:asc',
		limit: 5000, // TODO: Check later for improvements
		isFinal: false,
	}, ['height']);

	return lastIndexedHeight || [];
};

const updateNonFinalBlocks = async () => {
	const cHeight = await getCurrentHeight();
	const nfHeights = await getNonFinalHeights();

	if (nfHeights.length > 0) {
		logger.info(`Re-indexing ${nfHeights.length} non-finalized blocks in the search index database`);
		await buildIndex(nfHeights[0].height, cHeight);
	}
};

const getMissingBlocks = async (params) => {
	const missingBlockRanges = await findMissingBlocksInRange(params.from, params.to);
	const nestedListOfRanges = missingBlockRanges
		.map(entry => range(entry.from, entry.to + 1)); // 'to + 1' as 'to' is non-inclusive
	const listOfMissingBlocks = nestedListOfRanges.flat();
	return listOfMissingBlocks;
};

const isGenesisBlockIndexed = async () => {
	const blocksDB = await getBlocksIndex();
	const genesisHeight = await getGenesisHeight();
	const [block] = await blocksDB.find({ height: genesisHeight, limit: 1 }, ['height']);
	return !!block;
};

const addBlockToQueue = async height => indexBlocksQueue.add({ height });

module.exports = {
	indexBlock,
	indexNewBlock,
	updateNonFinalBlocks,
	isGenesisBlockIndexed,
	addBlockToQueue,
	getMissingBlocks,
	deleteBlock,
};