/*
 * Klayrhq/klayrservice
 * Copyright © 2021 Lisk Foundation
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
	Exceptions: { ServiceUnavailableException },
	Logger,
} = require('klayr-service-framework');

const config = require('../config');
const { reload } = require('../shared/market/sources/bitrue');

const logger = Logger();

const reloadMarketPrices = async () =>
	reload().catch(err => {
		logger.warn(
			`Unable to fetch market prices from Bitrue right now due to: (${err.message}). Will retry later.`,
		);
		return;
	});

module.exports = [
	{
		name: 'prices.retrieve.bitrue',
		description: 'Fetches up-to-date market prices from Bitrue.',
		interval: config.job.refreshPricesBitrue.interval,
		schedule: config.job.refreshPricesBitrue.schedule,
		init: async () => {
			logger.debug('Initializing market prices from Bitrue.');
			await reloadMarketPrices();
		},
		controller: async () => {
			logger.debug('Job scheduled to update prices from Bitrue.');
			await reloadMarketPrices();
		},
	},
];
