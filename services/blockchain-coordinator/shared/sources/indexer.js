/*
 * Klayrhq/klayrservice
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
const { Logger } = require('klayr-service-framework');
const config = require('../../config');
const { waitForIndexerReady } = require('../indexerReady');
const delay = require('../utils/delay');
const { requestIndexer } = require('../utils/request');
const logger = Logger();

let isGenesisBlockIndexedFlag = false;

const isGenesisBlockIndexed = async () => {
	if (isGenesisBlockIndexedFlag !== true) {
		isGenesisBlockIndexedFlag = await requestIndexer('isGenesisBlockIndexed');
	}
	return isGenesisBlockIndexedFlag;
};

const getIndexStatus = async () => requestIndexer('index.status').catch(() => null);

const getMissingBlocks = async (from, to) => {
	await waitForIndexerReady();

	while (true) {
		try {
			return await requestIndexer(
				'getMissingBlocks',
				{ from, to },
				{ timeout: config.brokerTimeout * 1000 * 3 },
			);
		} catch (err) {
			if (err.message.includes('indexer.getMissingBlocks') && err.message.includes('timed out')) {
				logger.warn(
					`timeout detected while requesting indexer.getMissingBlocks from ${from} to ${to},, will retry after ${
						config.requestTimeoutRetryDelay / 1000
					} seconds!`,
				);
				await delay(config.requestTimeoutRetryDelay);
				continue;
			} else {
				logger.error(
					`Failed to request indexer.getMissingBlocks from ${from} to ${to} due to a non-timeout error: ${err.message}`,
				);
				throw err;
			}
		}
	}
};

const getIndexVerifiedHeight = async () =>
	requestIndexer('getIndexVerifiedHeight').catch(() => null);

const getLiveIndexingJobCount = async () =>
	requestIndexer('getLiveIndexingJobCount').catch(
		// So that no new jobs are scheduled when indexer is failing to respond
		() => config.job.indexMissingBlocks.skipThreshold,
	);

module.exports = {
	isGenesisBlockIndexed,
	getIndexStatus,
	getMissingBlocks,
	getIndexVerifiedHeight,
	getLiveIndexingJobCount,
};
