/*
 * LiskHQ/lisk-service
 * Copyright © 2019 Lisk Foundation
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
const registerApi = require('./shared/registerHttpApi');

const defaultConfig = {
	whitelist: [
		'$node.*',
	],

	aliases: {
		'GET health': '$node.health',
	},

	callOptions: {
		timeout: 30000,
		retries: 3,
	},

	authorization: false,
	mergeParams: true,

	mappingPolicy: 'restrict',

	bodyParsers: {
		json: true,
		urlencoded: { extended: true },
	},
};

module.exports = [
	registerApi('http-version1', { ...defaultConfig, path: '/v1' }),
	registerApi('http-version1-compat', { ...defaultConfig, path: '/v1' }),
	registerApi('http-test', { ...defaultConfig, path: '/test' }),
	registerApi('http-status', { ...defaultConfig, path: '/' }),
];