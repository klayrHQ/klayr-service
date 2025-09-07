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
const {
	waitForConnectorWorkloadReady,
	waitForConnectorReady,
	waitForConnectorStatusReady,
} = require('../connectorReady');
const { requestConnector } = require('../utils/request');
const delay = require('../utils/delay');
const logger = Logger();

const waitForConnector = async () => {
	await waitForConnectorReady();
	await waitForConnectorStatusReady();
	await waitForConnectorWorkloadReady();
};

const getAllPosValidators = async () => {
	await waitForConnector();

	while (true) {
		try {
			return await requestConnector(
				'getAllPosValidators',
				{},
				{ timeout: config.brokerTimeout * 1000 * 3 },
			);
		} catch (err) {
			if (
				err.message.includes('connector.getAllPosValidators') &&
				err.message.includes('timed out')
			) {
				logger.warn(
					`timeout detected while requesting connector.getAllPosValidators, will retry after ${
						config.requestTimeoutRetryDelay / 1000
					} seconds!`,
				);
				await delay(config.requestTimeoutRetryDelay);
				continue;
			} else {
				logger.error(
					`Failed to request connector.getAllPosValidators due to a non-timeout error: ${err.message}`,
				);
				throw err;
			}
		}
	}
};

const getBlocksByHeightBetween = async (from, to) => {
	await waitForConnector();

	while (true) {
		try {
			return await requestConnector(
				'getBlocksByHeightBetween',
				{ from, to },
				{ timeout: config.brokerTimeout * 1000 * 3 },
			);
		} catch (err) {
			if (
				err.message.includes('connector.getBlocksByHeightBetween') &&
				err.message.includes('timed out')
			) {
				logger.warn(
					`timeout detected while requesting connector.getBlocksByHeightBetween from ${from} to ${to}, will retry after ${
						config.requestTimeoutRetryDelay / 1000
					} seconds!`,
				);
				await delay(config.requestTimeoutRetryDelay);
				continue;
			} else {
				logger.error(
					`Failed to request connector.getBlocksByHeightBetween from ${from} to ${to} due to a non-timeout error: ${err.message}`,
				);
				throw err;
			}
		}
	}
};

module.exports = {
	getAllPosValidators,
	getBlocksByHeightBetween,
};
