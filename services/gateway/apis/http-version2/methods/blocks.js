/*
 * LiskHQ/lisk-service
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
const blocksSource = require('../../../sources/version2/blocks');
const envelope = require('../../../sources/version2/mappings/stdEnvelope');
const { transformParams, response } = require('../../swagger/utils');

module.exports = {
	version: '2.0',
	swaggerApiPath: '/blocks',
	rpcMethod: 'get.blocks',
	tags: ['Blocks'],
	params: {
		blockId: { optional: true, type: 'string', min: 1, max: 64, pattern: /^([1-9]|[A-Fa-f0-9]){1,64}$/ },
		height: { optional: true, type: 'string', min: 1, pattern: /([0-9]+|[0-9]+:[0-9]+)/ },
		timestamp: { optional: true, type: 'string', min: 1, pattern: /([0-9]+|[0-9]+:[0-9]+)/ },
		generatorAddress: { optional: true, type: 'string', min: 38, max: 41, pattern: /^lsk([a-hjkm-z]|[2-9]){38}$/ },
		generatorPublicKey: { optional: true, type: 'string', min: 64, max: 64, pattern: /^([A-Fa-f0-9]{2}){32}$/ },
		generatorUsername: { optional: true, type: 'string', min: 1, max: 20, pattern: /^[a-z0-9!@$&_.]{1,20}$/ },
		limit: { optional: true, type: 'number', min: 1, max: 100, default: 10, pattern: /^\b((?:[1-9][0-9]?)|100)\b$/ },
		offset: { optional: true, type: 'number', min: 0, default: 0, pattern: /^\b([0-9][0-9]*)\b$/ },
		sort: {
			optional: true,
			type: 'string',
			enum: ['height:asc', 'height:desc', 'timestamp:asc', 'timestamp:desc'],
			default: 'height:desc',
		},
	},
	get schema() {
		const blockSchema = {};
		blockSchema[this.swaggerApiPath] = { get: {} };
		blockSchema[this.swaggerApiPath].get.tags = this.tags;
		blockSchema[this.swaggerApiPath].get.summary = 'Requests blocks data';
		blockSchema[this.swaggerApiPath].get.description = `Returns block data\n RPC=> ${this.rpcMethod}`;
		blockSchema[this.swaggerApiPath].get.parameters = transformParams('blocks', this.params);
		blockSchema[this.swaggerApiPath].get.responses = {
			200: {
				description: 'array of blocks',
				schema: {
					type: 'array',
					items: {
						$ref: '#/definitions/BlocksWithEnvelope',
					},
				},
			},
		};
		Object.assign(blockSchema[this.swaggerApiPath].get.responses, response);
		return blockSchema;
	},
	source: blocksSource,
	envelope,
};
