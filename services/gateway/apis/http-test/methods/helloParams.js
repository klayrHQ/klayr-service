/*
 * Klayrhq/klayrservice
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

module.exports = {
	version: '2.0',
	swaggerApiPath: '/hello/{path_name}',
	rpcMethod: 'get.hello.param',
	params: {
		path_name: { optional: false, type: 'string', min: 3 },
	},
	envelope: {
		data: [],
		meta: {},
		links: {},
	},
	source: {
		type: 'moleculer',
		method: 'template.parametrized.hello',
		params: {
			name: 'path_name',
		},
		definition: {
			data: [
				'data',
				{
					message: '=',
					name: '=',
				},
			],
			meta: {
				count: 'meta.count,number',
				offset: '=,number',
				total: 'meta.total,number',
			},
			links: {},
		},
	},
};
