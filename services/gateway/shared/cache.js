const { CacheRedis } = require('klayr-service-framework');
const config = require('../config');

const gatewayCache = CacheRedis('gatewayCache', config.volatileRedis);

const getGatewayCache = async key => {
	return await gatewayCache.get(key);
};

const setGatewayCache = async (key, value, ttl) => {
	return await gatewayCache.set(key, value, ttl);
};

module.exports = { getGatewayCache, setGatewayCache };
