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
const MessageQueue = require('bull');

const {
	Logger,
} = require('lisk-service-framework');

const logger = Logger();

const {
	buildLegacyAccountCache,
	addAccountToAddrUpdateQueue,
} = require('./indexer/accountIndex');

const {
	indexNewBlock,
	addBlockToQueue,
} = require('./indexer/blockchainIndex');
const status = require('./indexer/indexStatus');

const config = require('../config');

const blockIndexQueue = new MessageQueue('Blocks', config.endpoints.redisCoordinator);
const accountIndexQueue = new MessageQueue('Accounts', config.endpoints.redisCoordinator);

let isLegacyAccountCached = false;

const initProcess = async () => {
	blockIndexQueue.process(async (job) => {
		logger.debug('Subscribed to block index message queue');
		const { height, isNewBlock } = job.data;

		if (isNewBlock) {
			await indexNewBlock(height);
		} else {
			await addBlockToQueue(height);
			logger.info(`Index block at height: ${height}`);
		}
	});

	accountIndexQueue.process(async (job) => {
		logger.debug('Subsribed to account index message queue');
		if (!isLegacyAccountCached) {
			await buildLegacyAccountCache();
			isLegacyAccountCached = true;
			logger.info('Legacy accounts caching is done.');
		}

		const { address } = job.data;
		await addAccountToAddrUpdateQueue(address);
		logger.info(`Index account with address: ${address}`);
	});
};

const init = async () => {
	await status.init();
	await initProcess();
};

module.exports = {
	init,
};
