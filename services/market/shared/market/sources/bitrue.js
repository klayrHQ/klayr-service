/* eslint-disable import/no-unresolved */
const { CacheRedis } = require('klayr-service-framework');

const ccxt = require('ccxt');

const bitrue = new ccxt.bitrue();

const { validateEntries } = require('./common');
const config = require('../../../config');

const bitrueCache = CacheRedis('bitrue_prices', config.endpoints.redis);

const { allowRefreshAfter } = config.market.sources.bitrue;
const expireMiliseconds = config.ttl.bitrue;

const getFromCache = async () => {
	const serializedPrice = await bitrueCache.get(`bitrue_KLY_USD`);
	if (serializedPrice) return JSON.parse(serializedPrice);
	return null;
};

const reload = async () => {
	if (validateEntries(await getFromCache(), allowRefreshAfter)) {
		const data = await bitrue.fetchTicker('KLYUSDT');
		const price = [
			{
				code: 'KLY_USD',
				from: 'KLY',
				to: 'USD',
				rate: data.last,
				updateTimestamp: Math.floor(Date.now() / 1000),
				sources: ['bitrue'],
			},
		];
		bitrueCache.set(`bitrue_KLY_USD`, JSON.stringify(price), expireMiliseconds);
	}
};

module.exports = {
	reload,
	getFromCache,
};
