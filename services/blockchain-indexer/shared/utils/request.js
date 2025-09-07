/*
 * Klayrhq/klayrservice
 * Copyright © 2022 Lisk Foundation
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
const { Utils } = require('klayr-service-framework');

let app;

const setAppContext = h => (app = h);

const getAppContext = () => app;

const requestRpc = async (service, method, params = {}, options = {}) => {
	const broker = getAppContext().getBroker();
	const data = await broker.call(`${service}.${method}`, params, options);
	if (Utils.isObject(data) && data.error) throw new Error(data.error.message);
	return data;
};

const requestConnector = async (method, params, options) =>
	requestRpc('connector', method, params, options);

const requestCoordinator = async (method, params, options) =>
	requestRpc('coordinator', method, params, options);

const requestAppRegistry = async (method, params, options) =>
	requestRpc('app-registry', method, params, options);

const requestFeeEstimator = async (method, params, options) =>
	requestRpc('fees', method, params, options);

module.exports = {
	getAppContext,
	setAppContext,
	requestConnector,
	requestAppRegistry,
	requestFeeEstimator,
	requestCoordinator,
};
