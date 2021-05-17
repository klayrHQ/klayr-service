/*
 * LiskHQ/lisk-service
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
const logger = require('lisk-service-framework').Logger();
const { reloadPricesFromBinance } = require('../shared/market');

module.exports = [
    {
        name: 'prices.retrieve.binance',
        description: 'Fetches up-to-date market prices from Binance',
        schedule: '* * * * *', // Every 1 min
        init: async () => {
            logger.debug('Initializing market prices');
            await reloadPricesFromBinance();
        },
        controller: async () => {
            logger.debug('Job scheduled to update prices from Binance');
            await reloadPricesFromBinance();
        },
    },
];
