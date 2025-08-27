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
const util = require('util');
const BluebirdPromise = require('bluebird');
const { Logger, CacheRedis } = require('klayr-service-framework');

const config = require('../../config');

const binance = require('./sources/binance');
const bitrue = require('./sources/bitrue');
const probit = require('./sources/probit');
const exchangeratesapi = require('./sources/exchangeratesapi');
const { formatCalculatedRate } = require('../utils/priceUpdater');

const pricesCache = CacheRedis('market_prices', config.endpoints.redis);
const logger = Logger();

const targetPairs = config.market.targetPairs.split(',');

let isWarnMessageDisplayed = false;

const getRawPricesBySource = async () => ({
	binance: await binance.getFromCache(),
	bitrue: await bitrue.getFromCache(),
	probit: await probit.getFromCache(),
	exchangeratesapi: await exchangeratesapi.getFromCache(),
});

const calcTargetPairPrices = (rawPricesBySource, targetPairings = targetPairs) => {
	const finalPrices = {};

	// Flatten the source prices
	const sourcePrices = [];
	const rawPricesEntries = Object.entries(rawPricesBySource);
	for (let i = 0; i < rawPricesEntries.length; i++) {
		const source = rawPricesEntries[i][0];
		const prices = rawPricesEntries[i][1];

		// Append source name to the price code and push to sourcePrices array
		// Eg: KLY_BTC from binance results in binance_LSK_EUR
		if (Array.isArray(prices)) {
			for (let j = 0; j < prices.length; j++) {
				sourcePrices.push({ ...prices[j], code: `${source}_${prices[j].code}` });
			}
		} else if (isWarnMessageDisplayed === false) {
			logger.warn(`Data from '${source}' is unavailable for market price computation.`);
			isWarnMessageDisplayed = true;
		}
	}

	// Loop through each target pair and calculate the final prices
	for (let i = 0; i < targetPairings.length; i++) {
		const targetPair = targetPairings[i];
		finalPrices[targetPair] = [];

		const [tpSource, tpTarget] = targetPair.split('_');

		const rawPricesWithMatchingSource = [];
		for (let j = 0; j < sourcePrices.length; j++) {
			if (sourcePrices[j].code.includes(`_${tpSource}_`))
				rawPricesWithMatchingSource.push(sourcePrices[j]);
		}

		const rawPricesWithMatchingTarget = [];
		for (let j = 0; j < sourcePrices.length; j++) {
			if (sourcePrices[j].code.endsWith(`_${tpTarget}`))
				rawPricesWithMatchingTarget.push(sourcePrices[j]);
		}

		for (let k = 0; k < rawPricesWithMatchingSource.length; k++) {
			const rps = rawPricesWithMatchingSource[k];

			if (rps.code.endsWith(`_${targetPair}`)) {
				// If code is an exact match of the target pair, use the prices as is
				finalPrices[targetPair].push({
					...rps,
					code: targetPair,
					rate: formatCalculatedRate(tpTarget, rps.rate),
				});
			} else {
				// If exact match not found, check for intermediate pairs and calculate the required price
				// Eg: KLY_EUR price can be calculated from KLY_BTC and BTC_EUR price values

				// intermediateTarget is BTC in binance_KLY_BTC
				const [, , intermediateTarget] = rps.code.split('_');

				for (let m = 0; m < rawPricesWithMatchingTarget.length; m++) {
					const rpt = rawPricesWithMatchingTarget[m];
					if (rpt.code.includes(`_${intermediateTarget}_`)) {
						if (rps.code !== rpt.code && rps.sources[0] !== rpt.sources[0]) {
							const finalPrice = {
								code: targetPair,
								from: tpSource,
								to: tpTarget,
								rate: formatCalculatedRate(tpTarget, rps.rate * rpt.rate),
								updateTimestamp: Math.min(rps.updateTimestamp, rpt.updateTimestamp),
								sources: rps.sources.concat(rpt.sources),
							};

							finalPrices[targetPair].push(finalPrice);
						}
					}
				}
			}
			// Prefer a direct targetPair match from the source prices over calculated rates
			finalPrices[targetPair].sort((a, b) => a.sources.length - b.sources.length);
		}
	}

	return finalPrices;
};

const updatePricesCache = prices =>
	BluebirdPromise.all(targetPairs.map(pair => pricesCache.set(pair, JSON.stringify(prices[pair]))));

const updatePrices = async () => {
	const rawPricesBySource = await getRawPricesBySource();
	logger.debug('Raw prices by source: ', util.inspect(rawPricesBySource, false, 3, true));

	const targetPairPrices = calcTargetPairPrices(rawPricesBySource);
	logger.debug(
		'Final calculated prices by target pairs: ',
		util.inspect(targetPairPrices, false, 3, true),
	);

	await updatePricesCache(targetPairPrices);
	return true;
};

module.exports = {
	targetPairs,
	calcTargetPairPrices,
	updatePrices,
};
