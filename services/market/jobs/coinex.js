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
const { reload } = require('../shared/market/sources/coinex');

const logger = Logger();

const reloadMarketPrices = async () =>
	reload().catch(err => {
		if (err instanceof ServiceUnavailableException) {
			logger.warn('Unable to fetch market prices from Coinex right now. Will retry later.');
			return;
		}
		throw err;
	});

module.exports = [
	{
		name: 'prices.retrieve.coinex',
		description: 'Fetches up-to-date market prices from Coinex.',
		interval: config.job.refreshPricesCoinex.interval,
		schedule: config.job.refreshPricesCoinex.schedule,
		init: async () => {
			logger.debug('Initializing market prices from Coinex.');
			await reloadMarketPrices();
		},
		controller: async () => {
			logger.debug('Job scheduled to update prices from Coinex.');
			await reloadMarketPrices();
		},
	},
];
