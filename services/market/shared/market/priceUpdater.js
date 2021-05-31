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
const util = require('util');
const BluebirdPromise = require('bluebird');
const { Logger, CacheRedis } = require('lisk-service-framework');

const config = require('../../config');

const binance = require('./sources/binance');
const bittrex = require('./sources/bittrex');
const exchangeratesapi = require('./sources/exchangeratesapi');
const kraken = require('./sources/kraken');

const pricesCache = CacheRedis('market_prices', config.endpoints.redis);
const logger = Logger();

const targetPairs = config.market.targetPairs || [
	'LSK_EUR', 'LSK_USD', 'LSK_CHF',
	'BTC_EUR', 'BTC_USD', 'BTC_CHF',
];

const getRawPricesBySource = async () => {
	const binancePrices = await binance.getFromCache();
	const bittrexPrices = await bittrex.getFromCache();
	const exchangeratesapiPrices = await exchangeratesapi.getFromCache();
	const krakenPrices = await kraken.getFromCache();

	return {
		binance: binancePrices,
		bittrex: bittrexPrices,
		exchangeratesapi: exchangeratesapiPrices,
		kraken: krakenPrices,
	};
};

const calcTargetPairPrices = (rawPricesBySource, targetPairings = targetPairs) => {
	const finalPrices = {};

	// Flatten the source prices
	const sourcePrices = [];
	Object.entries(rawPricesBySource).forEach(([source, prices]) => {
		// Append source name to the price code and push to sourcePrices array
		// Eg: LSK_BTC from binance results in binance_LSK_EUR
		prices.forEach(item => sourcePrices.push({ ...item, code: `${source}_${item.code}` }));
	});

	// Loop through each target pair and calculate the final prices
	targetPairings.forEach(targetPair => {
		finalPrices[targetPair] = [];

		const [tpSource, tpTarget] = targetPair.split('_');
		const rawPricesWithMatchingSource = sourcePrices.filter(p => p.code.includes(`_${tpSource}_`));
		const rawPricesWithMatchingTarget = sourcePrices.filter(p => p.code.endsWith(`_${tpTarget}`));

		rawPricesWithMatchingSource.forEach(rps => {
			if (rps.code.endsWith(`_${targetPair}`)) {
				// If code is an exact match of the target pair, use the prices as is
				finalPrices[targetPair].push({ ...rps, code: targetPair });
			} else {
				// If exact match not found, check for intermediate pairs and calculate the required price
				// Eg: LSK_EUR price can be calculated from LSK_BTC and BTC_EUR price values

				// intermediateTarget is BTC in binance_LSK_BTC
				const [, , intermediateTarget] = rps.code.split('_');

				rawPricesWithMatchingTarget
					// Eg: if _BTC_ in bittex_BTC_EUR
					.filter(rpt => rpt.code.includes(`_${intermediateTarget}_`))
					.forEach(rpt => {
						if (rps.code !== rpt.code && rps.sources[0] !== rpt.sources[0]) {
							const finalPrice = {
								code: targetPair,
								from: tpSource,
								to: tpTarget,
								rate: String(rps.rate * rpt.rate),
								updateTimestamp: Math.min(rps.updateTimestamp, rpt.updateTimestamp),
								sources: rps.sources.concat(rpt.sources),
							};

							finalPrices[targetPair].push(finalPrice);
						}
					});
			}
		});
	});

	return finalPrices;
};

const updatePricesCache = (prices) => BluebirdPromise
	.all(targetPairs.map(pair => pricesCache.set(pair, JSON.stringify(prices[pair]))));

const updatePrices = async () => {
	const rawPricesBySource = await getRawPricesBySource();
	logger.debug('Raw prices by source: ', util.inspect(rawPricesBySource, false, 3, true));

	const targetPairPrices = calcTargetPairPrices(rawPricesBySource);
	logger.debug('Final calculated prices by target pairs: ', util.inspect(rawPricesBySource, false, 3, true));

	await updatePricesCache(targetPairPrices);
	return true;
};

module.exports = {
	targetPairs,
	calcTargetPairPrices,
	updatePrices,
};
