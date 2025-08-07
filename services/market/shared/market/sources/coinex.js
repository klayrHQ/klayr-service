/* eslint-disable import/no-unresolved */
const { CacheRedis } = require('klayr-service-framework');

const ccxt = require('ccxt');

const coinex = new ccxt.coinex();

const { validateEntries } = require('./common');
const config = require('../../../config');

const coinexCache = CacheRedis('coinex_prices', config.endpoints.redis);

const { allowRefreshAfter } = config.market.sources.coinex;
const expireMiliseconds = config.ttl.coinex;

const getFromCache = async () => {
	const serializedPrice = await coinexCache.get(`coinex_KLY_USD`);
	if (serializedPrice) return JSON.parse(serializedPrice);
	return null;
};

const reload = async () => {
	if (validateEntries(await getFromCache(), allowRefreshAfter)) {
		const data = await coinex.fetchTicker('KLYUSDT');
		const price = [
			{
				code: 'KLY_USD',
				from: 'KLY',
				to: 'USD',
				rate: data.last,
				updateTimestamp: Math.floor(Date.now() / 1000),
				sources: ['coinex'],
			},
		];
		coinexCache.set(`coinex_KLY_USD`, JSON.stringify(price), expireMiliseconds);
	}
};

module.exports = {
	reload,
	getFromCache,
};
