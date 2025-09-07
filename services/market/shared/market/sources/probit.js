/* eslint-disable import/no-unresolved */
const { CacheRedis } = require('klayr-service-framework');

const ccxt = require('ccxt');

const probit = new ccxt.probit();

const { validateEntries } = require('./common');
const config = require('../../../config');

const probitCache = CacheRedis('probit_prices', config.endpoints.redis);

const { allowRefreshAfter } = config.market.sources.probit;
const expireMiliseconds = config.ttl.probit;

const getFromCache = async () => {
	const serializedPrice = await probitCache.get(`probit_KLY_USD`);
	if (serializedPrice) return JSON.parse(serializedPrice);
	return null;
};

const reload = async () => {
	if (validateEntries(await getFromCache(), allowRefreshAfter)) {
		const data = await probit.fetchTicker('KLY/USDT');
		const price = [
			{
				code: 'KLY_USD',
				from: 'KLY',
				to: 'USD',
				rate: data.last,
				updateTimestamp: Math.floor(Date.now() / 1000),
				sources: ['probit'],
			},
		];
		probitCache.set(`probit_KLY_USD`, JSON.stringify(price), expireMiliseconds);
	}
};

module.exports = {
	reload,
	getFromCache,
};
