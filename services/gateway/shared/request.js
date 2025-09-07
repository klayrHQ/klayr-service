const { Utils } = require('klayr-service-framework');
const { getAppContext } = require('./appContext');

const requestRpc = async (service, method, params = {}, options = {}) => {
	const broker = getAppContext().getBroker();
	const data = await broker.call(`${service}.${method}`, params, options);
	if (Utils.isObject(data) && data.error) throw new Error(data.error.message);
	return data;
};

const requestConnector = async (method, params, options) =>
	requestRpc('connector', method, params, options);

module.exports = {
	requestConnector,
};
