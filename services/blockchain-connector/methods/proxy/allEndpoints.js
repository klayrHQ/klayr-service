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
const { getRegisteredEndpoints } = require('../../shared/sdk/cached_endpoints');
const { invokeEndpointProxy } = require('../../shared/sdk/invoke');

const exportAllEndpoints = async () => {
	const registeredEndpoints = await getRegisteredEndpoints();
	const allMethods = registeredEndpoints.map(endpoint => {
		const genericController = regEndpoint => params => invokeEndpointProxy(regEndpoint, params);
		const controller = genericController(endpoint);
		return {
			name: endpoint,
			description: `Endpoint: ${endpoint}`,
			controller,
			params: {
				params: { optional: true, type: 'object' },
			},
		};
	});
	return allMethods;
};

module.exports = exportAllEndpoints();
