/*
 * Klayrhq/klayrservice
 * Copyright © 2023 Lisk Foundation
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
const expectedResponseForRegisterHttpApi = [
	{
		whitelist: [
			'indexer.account',
			'indexer.blocks.assets',
			'indexer.blockchain.apps',
			'app-registry.blockchain.apps.meta.list',
			'app-registry.blockchain.apps.meta',
			'indexer.blockchain.apps.statistics',
			'app-registry.blockchain.apps.meta.tokens',
			'app-registry.blockchain.apps.meta.tokens.supported',
			'indexer.blocks',
			'indexer.events',
			'fees.estimates',
			'indexer.generators',
			'indexer.index.status',
			'indexer.invokeEndpoint',
			'market.prices',
			'indexer.network.peers',
			'indexer.network.statistics',
			'indexer.network.status',
			'indexer.transactions.post',
			'indexer.schemas',
			'indexer.search',
			'gateway.spec',
			'indexer.transactions',
			'indexer.transactions.dryrun',
			'indexer.transactions.estimate-fees',
			'statistics.transactions.statistics',
			'indexer.legacy',
			'indexer.pos.rewards.claimable',
			'indexer.pos.constants',
			'indexer.pos.rewards.locked',
			'indexer.pos.stakers',
			'indexer.pos.stakes',
			'indexer.pos.unlocks',
			'indexer.pos.validators',
			'indexer.pos.validators.count',
			'indexer.token.account.exists',
			'indexer.token.available-ids',
			'indexer.token.constants',
			'indexer.token.summary',
			'indexer.token.balances.top',
			'indexer.validator',
			'indexer.validateBLSKey',
			'export.transactions.csv',
			'export.transactions.schedule',
		],
		aliases: {
			'GET account': { action: 'indexer.account' },
			'GET blocks/assets': { action: 'indexer.blocks.assets' },
			'GET blockchain/apps': { action: 'indexer.blockchain.apps' },
			'GET blockchain/apps/meta/list': { action: 'app-registry.blockchain.apps.meta.list' },
			'GET blockchain/apps/meta': { action: 'app-registry.blockchain.apps.meta' },
			'GET blockchain/apps/statistics': { action: 'indexer.blockchain.apps.statistics' },
			'GET blockchain/apps/meta/tokens': { action: 'app-registry.blockchain.apps.meta.tokens' },
			'GET blockchain/apps/meta/tokens/supported': {
				action: 'app-registry.blockchain.apps.meta.tokens.supported',
			},
			'GET blocks': { action: 'indexer.blocks' },
			'GET events': { action: 'indexer.events' },
			'GET fees': { action: 'fees.estimates' },
			'GET generators': { action: 'indexer.generators' },
			'GET index/status': { action: 'indexer.index.status' },
			'POST invoke': { action: 'indexer.invokeEndpoint' },
			'GET market/prices': { action: 'market.prices' },
			'GET network/peers': { action: 'indexer.network.peers' },
			'GET network/statistics': { action: 'indexer.network.statistics' },
			'GET network/status': { action: 'indexer.network.status' },
			'POST transactions': { action: 'indexer.transactions.post' },
			'GET schemas': { action: 'indexer.schemas' },
			'GET search': { action: 'indexer.search' },
			'GET spec': { action: 'gateway.spec' },
			'GET transactions': { action: 'indexer.transactions' },
			'POST transactions/dryrun': { action: 'indexer.transactions.dryrun' },
			'POST transactions/estimate-fees': { action: 'indexer.transactions.estimate-fees' },
			'GET transactions/statistics': { action: 'statistics.transactions.statistics' },
			'GET legacy': { action: 'indexer.legacy' },
			'GET pos/rewards/claimable': { action: 'indexer.pos.rewards.claimable' },
			'GET pos/constants': { action: 'indexer.pos.constants' },
			'GET pos/rewards/locked': { action: 'indexer.pos.rewards.locked' },
			'GET pos/stakers': { action: 'indexer.pos.stakers' },
			'GET pos/stakes': { action: 'indexer.pos.stakes' },
			'GET pos/unlocks': { action: 'indexer.pos.unlocks' },
			'GET pos/validators': { action: 'indexer.pos.validators' },
			'GET pos/validators/status-count': { action: 'indexer.pos.validators.count' },
			'GET token/account/exists': { action: 'indexer.token.account.exists' },
			'GET token/available-ids': { action: 'indexer.token.available-ids' },
			'GET token/constants': { action: 'indexer.token.constants' },
			'GET token/summary': { action: 'indexer.token.summary' },
			'GET token/balances/top': { action: 'indexer.token.balances.top' },
			'GET validator': { action: 'indexer.validator' },
			'POST validator/validate-bls-key': { action: 'indexer.validateBLSKey' },
			'GET export/download': { action: 'export.transactions.csv' },
			'GET export/transactions': { action: 'export.transactions.schedule' },
		},
		path: '/v3',
		etag: 'strong',
	},
	{
		whitelist: ['indexer.token.balances'],
		aliases: {
			'GET /': { action: 'indexer.token.balances' },
		},
		path: '/v3/token/balances',
		etag: false,
	},
];

const expectedResponseForRegisterRpcApi = {
	events: {
		request: {
			whitelist: [
				'indexer.account',
				'indexer.blocks.assets',
				'indexer.blockchain.apps',
				'app-registry.blockchain.apps.meta.list',
				'app-registry.blockchain.apps.meta',
				'indexer.blockchain.apps.statistics',
				'app-registry.blockchain.apps.meta.tokens',
				'app-registry.blockchain.apps.meta.tokens.supported',
				'indexer.blocks',
				'indexer.events',
				'fees.estimates',
				'indexer.generators',
				'indexer.index.status',
				'indexer.invokeEndpoint',
				'market.prices',
				'indexer.network.peers',
				'indexer.network.statistics',
				'indexer.network.status',
				'indexer.transactions.post',
				'indexer.schemas',
				'indexer.search',
				'indexer.transactions',
				'indexer.transactions.dryrun',
				'indexer.transactions.estimate-fees',
				'statistics.transactions.statistics',
				'indexer.legacy',
				'indexer.pos.rewards.claimable',
				'indexer.pos.constants',
				'indexer.pos.rewards.locked',
				'indexer.pos.stakers',
				'indexer.pos.stakes',
				'indexer.pos.unlocks',
				'indexer.pos.validators',
				'indexer.pos.validators.count',
				'indexer.token.account.exists',
				'indexer.token.available-ids',
				'indexer.token.balances',
				'indexer.token.constants',
				'indexer.token.summary',
				'indexer.token.balances.top',
				'indexer.validator',
				'indexer.validateBLSKey',
				'export.transactions.schedule',
			],
			aliases: {
				'get.account': 'indexer.account',
				'get.blocks.assets': 'indexer.blocks.assets',
				'get.blockchain.apps': 'indexer.blockchain.apps',
				'get.blockchain.apps.meta.list': 'app-registry.blockchain.apps.meta.list',
				'get.blockchain.apps.meta': 'app-registry.blockchain.apps.meta',
				'get.blockchain.apps.statistics': 'indexer.blockchain.apps.statistics',
				'get.blockchain.apps.meta.tokens': 'app-registry.blockchain.apps.meta.tokens',
				'get.blockchain.apps.meta.tokens.supported':
					'app-registry.blockchain.apps.meta.tokens.supported',
				'get.blocks': 'indexer.blocks',
				'get.events': 'indexer.events',
				'get.fees': 'fees.estimates',
				'get.generators': 'indexer.generators',
				'get.index.status': 'indexer.index.status',
				'post.invoke': 'indexer.invokeEndpoint',
				'get.market.prices': 'market.prices',
				'get.network.peers': 'indexer.network.peers',
				'get.network.statistics': 'indexer.network.statistics',
				'get.network.status': 'indexer.network.status',
				'post.transactions': 'indexer.transactions.post',
				'get.schemas': 'indexer.schemas',
				'get.search': 'indexer.search',
				'get.transactions': 'indexer.transactions',
				'post.transactions.estimate-fees': 'indexer.transactions.estimate-fees',
				'post.transactions.dryrun': 'indexer.transactions.dryrun',
				'get.transactions.statistics': 'statistics.transactions.statistics',
				'get.legacy': 'indexer.legacy',
				'get.pos.rewards.claimable': 'indexer.pos.rewards.claimable',
				'get.pos.constants': 'indexer.pos.constants',
				'get.pos.rewards.locked': 'indexer.pos.rewards.locked',
				'get.pos.stakers': 'indexer.pos.stakers',
				'get.pos.stakes': 'indexer.pos.stakes',
				'get.pos.unlocks': 'indexer.pos.unlocks',
				'get.pos.validators': 'indexer.pos.validators',
				'get.pos.validators.count': 'indexer.pos.validators.count',
				'get.token.account.exists': 'indexer.token.account.exists',
				'get.token.balances': 'indexer.token.balances',
				'get.token.balances.top': 'indexer.token.balances.top',
				'get.token.constants': 'indexer.token.constants',
				'get.token.available-ids': 'indexer.token.available-ids',
				'get.token.summary': 'indexer.token.summary',
				'get.validator': 'indexer.validator',
				'post.validator.validate-bls-key': 'indexer.validateBLSKey',
				'get.export.transactions': 'export.transactions.schedule',
			},
			mappingPolicy: 'restrict',
		},
	},
};

const methodDefForTransformResponse = {
	source: {
		definition: {
			data: [
				'data',
				{
					chainID: '=,string',
					chainName: '=,string',
					tokenID: '=,string',
					tokenName: '=,string',
					networkType: 'network,string',
					description: '=,string',
					logo: {
						png: '=,string',
						svg: '=,string',
					},
					symbol: '=,string',
					displayDenom: '=,string',
					baseDenom: '=,string',
					denomUnits: [
						'denomUnits',
						{
							denom: '=,string',
							decimals: '=,number',
							aliases: '=',
						},
					],
					customNumber: 'otherName,number', // Should use value of otherName key and covert to number
				},
			],
			meta: {
				count: '=,number',
				offset: '=,number',
				total: '=,number',
			},
			links: {},
		},
	},
	data: [],
	meta: {},
};

const dataForTransformResponse = {
	data: [
		{
			tokenID: '0400000000000000',
			tokenName: 'Klayr',
			description: 'Default token for the entire Klayr ecosystem',
			denomUnits: [
				{
					denom: 'beddows',
					decimals: 0,
					aliases: ['Beddows'],
				},
				{
					denom: 'kly',
					decimals: 8,
					aliases: ['Klayr'],
				},
			],
			baseDenom: 'beddows',
			displayDenom: 'kly',
			symbol: 'KLY',
			logo: {
				png: 'https://lisk-qa.ams3.digitaloceanspaces.com/Artboard%201%20copy%2019.png',
				svg: 'https://lisk-qa.ams3.digitaloceanspaces.com/Logo-20.svg',
			},
			chainID: '04000000',
			chainName: 'Klayr',
			network: 'devnet',
			otherName: '123',
		},
		{
			tokenID: '0400000000000000',
			tokenName: 'Klayr',
			description: 'Default token for the entire Klayr ecosystem',
			denomUnits: [
				{
					denom: 'beddows',
					decimals: 0,
					aliases: ['Beddows'],
				},
				{
					denom: 'kly',
					decimals: 8,
					aliases: ['Klayr'],
				},
			],
			baseDenom: 'beddows',
			displayDenom: 'kly',
			symbol: 'KLY',
			logo: {
				png: 'https://lisk-qa.ams3.digitaloceanspaces.com/Artboard%201%20copy%2019.png',
				svg: 'https://lisk-qa.ams3.digitaloceanspaces.com/Logo-20.svg',
			},
			chainID: '04000000',
			chainName: 'Klayr',
			network: 'devnet',
			otherName: '456',
		},
	],
	meta: {
		count: 2,
		offset: 0,
		total: 5,
	},
};

const expectedResponseForTransformResponse = {
	data: [
		{
			chainID: '04000000',
			chainName: 'Klayr',
			tokenID: '0400000000000000',
			tokenName: 'Klayr',
			networkType: 'devnet',
			description: 'Default token for the entire Klayr ecosystem',
			logo: {
				png: 'https://lisk-qa.ams3.digitaloceanspaces.com/Artboard%201%20copy%2019.png',
				svg: 'https://lisk-qa.ams3.digitaloceanspaces.com/Logo-20.svg',
			},
			symbol: 'KLY',
			displayDenom: 'kly',
			baseDenom: 'beddows',
			denomUnits: [
				{
					denom: 'beddows',
					decimals: 0,
					aliases: ['Beddows'],
				},
				{
					denom: 'kly',
					decimals: 8,
					aliases: ['Klayr'],
				},
			],
			customNumber: 123,
		},
		{
			chainID: '04000000',
			chainName: 'Klayr',
			tokenID: '0400000000000000',
			tokenName: 'Klayr',
			networkType: 'devnet',
			description: 'Default token for the entire Klayr ecosystem',
			logo: {
				png: 'https://lisk-qa.ams3.digitaloceanspaces.com/Artboard%201%20copy%2019.png',
				svg: 'https://lisk-qa.ams3.digitaloceanspaces.com/Logo-20.svg',
			},
			symbol: 'KLY',
			displayDenom: 'kly',
			baseDenom: 'beddows',
			denomUnits: [
				{
					denom: 'beddows',
					decimals: 0,
					aliases: ['Beddows'],
				},
				{
					denom: 'kly',
					decimals: 8,
					aliases: ['Klayr'],
				},
			],
			customNumber: 456,
		},
	],
	meta: {
		count: 2,
		offset: 0,
		total: 5,
	},
};

const paramsForTransformRequest = {
	tokenName: 'Klayr,Klay,Kly',
	tokenIDParam: '0200000000000000,0400000000000000',
	network: 'betanet,devnet',
	limit: 10,
	offset: 0,
	sort: 'chainName:asc',
};

const methodDefForTransformRequest = {
	source: {
		params: {
			chainName: '=,string',
			chainID: '=,string',
			tokenName: '=,string',
			tokenID: 'tokenIDParam,string', // Should fetch value from tokenIDParam and map with tokenID key
			network: '=,string',
			search: '=,string',
			offset: '=,number',
			limit: '=,number',
			sort: '=,string',
		},
	},
};

const expectedResponseForTransformRequest = {
	chainID: undefined,
	chainName: undefined,
	limit: 10,
	network: 'betanet,devnet',
	offset: 0,
	search: undefined,
	sort: 'chainName:asc',
	tokenID: '0200000000000000,0400000000000000',
	tokenName: 'Klayr,Klay,Kly',
};

const sourceForMapParamWithType = {
	key_str: 'val_str',
	key_bool: true,
	key_number: 123,
};

const paramsForTransformParams = {
	key_str: 'val_str',
	key_bool: true,
	key_number: 123,
	obj: { key: 'value' },
	arr: [1, 2, 3],
};

const specsForTransformParams = {
	new_key_str: 'key_str, string',
	key_bool: '=,boolean',
	str_from_number: 'key_number,string',
	obj: '=',
	arr: '=',
};

const expectedResponseForTransformParams = {
	new_key_str: 'val_str',
	key_bool: true,
	str_from_number: '123',
	obj: { key: 'value' },
	arr: [1, 2, 3],
};

const sourceForMapParam = {
	originalKey: 'originalValue',
	mappingKey: 'mappingValue',
};

const buildAPIAliasesPrefix = '/test';
const buildAPIAliasesMethods = {
	errorServer: {
		version: '2.0',
		swaggerApiPath: '/server_error',
		rpcMethod: 'get.server_error',
		envelope: {},
		source: {
			type: 'moleculer',
			method: 'template.server.error',
			params: {},
			definition: {
				error: '=,string',
				status: '=,number',
			},
		},
	},
	helloGeneric: {
		version: '2.0',
		swaggerApiPath: '/hello',
		rpcMethod: 'get.hello',
		envelope: {
			data: [],
			meta: {},
			links: {},
		},
		source: {
			type: 'moleculer',
			method: 'template.generic.hello',
			params: {},
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
	},
};

const buildAPIAliasesResponse = {
	aliases: {
		'GET /': { action: 'template.generic.hello' },
	},
	whitelist: ['template.server.error', 'template.generic.hello'],
	methodPaths: {
		'GET ': {
			version: '2.0',
			swaggerApiPath: '/hello',
			rpcMethod: 'get.hello',
			envelope: {
				data: [],
				meta: {},
				links: {},
			},
			source: {
				type: 'moleculer',
				method: 'template.generic.hello',
				params: {},
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
		},
	},
};

const buildAPIAliasesPrefixWithFalseEtag = '/v3';
const buildAPIAliasesMethodsWithFalseEtag = {
	key: {
		version: '2.0',
		swaggerApiPath: '/token/balances',
		rpcMethod: 'get.token.balances',
		tags: ['Token'],
		etag: false,
		params: {
			address: {
				optional: false,
				type: 'string',
				pattern: {},
			},
			tokenID: {
				optional: true,
				type: 'string',
				pattern: {},
			},
			limit: {
				optional: true,
				type: 'number',
				min: 1,
				max: 100,
				default: 10,
			},
			offset: {
				optional: true,
				type: 'number',
				min: 0,
				default: 0,
			},
		},
		schema: {
			'/token/balances': {
				get: {
					tags: ['Token'],
					summary: 'Requests tokens information',
					description: 'Returns tokens information\n RPC => get.token.balances',
					parameters: [
						{
							$ref: '#/parameters/address',
						},
						{
							$ref: '#/parameters/tokenID',
						},
						{
							$ref: '#/parameters/limit',
						},
						{
							$ref: '#/parameters/offset',
						},
					],
					responses: {
						200: {
							description: 'Returns a list of supported tokens by the blockchain application',
							schema: {
								$ref: '#/definitions/tokenWithEnvelope',
							},
						},
						400: {
							description: 'Bad request',
							schema: {
								$ref: '#/definitions/badRequest',
							},
						},
					},
				},
			},
		},
		source: {
			type: 'moleculer',
			method: 'indexer.token.balances',
			params: {
				address: '=,string',
				tokenID: '=,string',
				offset: '=,number',
				limit: '=,number',
			},
			definition: {
				data: [
					'data',
					{
						tokenID: '=,string',
						availableBalance: '=,string',
						lockedBalances: [
							'lockedBalances',
							{
								module: '=,string',
								amount: '=,string',
							},
						],
					},
				],
				meta: {
					address: '=,string',
					count: '=,number',
					offset: '=,number',
					total: '=,number',
				},
				links: {},
			},
		},
		envelope: {
			data: [],
			meta: {},
		},
	},
};

const buildAPIAliasesWithFalseEtagResponse = {
	aliases: {
		'GET /': { action: 'indexer.token.balances' },
	},
	whitelist: ['indexer.token.balances'],
	methodPaths: {
		'GET ': {
			version: '2.0',
			swaggerApiPath: '/token/balances',
			rpcMethod: 'get.token.balances',
			tags: ['Token'],
			etag: false,
			params: {
				address: {
					optional: false,
					type: 'string',
					pattern: {},
				},
				tokenID: {
					optional: true,
					type: 'string',
					pattern: {},
				},
				limit: {
					optional: true,
					type: 'number',
					min: 1,
					max: 100,
					default: 10,
				},
				offset: {
					optional: true,
					type: 'number',
					min: 0,
					default: 0,
				},
			},
			schema: {
				'/token/balances': {
					get: {
						tags: ['Token'],
						summary: 'Requests tokens information',
						description: 'Returns tokens information\n RPC => get.token.balances',
						parameters: [
							{
								$ref: '#/parameters/address',
							},
							{
								$ref: '#/parameters/tokenID',
							},
							{
								$ref: '#/parameters/limit',
							},
							{
								$ref: '#/parameters/offset',
							},
						],
						responses: {
							200: {
								description: 'Returns a list of supported tokens by the blockchain application',
								schema: {
									$ref: '#/definitions/tokenWithEnvelope',
								},
							},
							400: {
								description: 'Bad request',
								schema: {
									$ref: '#/definitions/badRequest',
								},
							},
						},
					},
				},
			},
			source: {
				type: 'moleculer',
				method: 'indexer.token.balances',
				params: {
					address: '=,string',
					tokenID: '=,string',
					offset: '=,number',
					limit: '=,number',
				},
				definition: {
					data: [
						'data',
						{
							tokenID: '=,string',
							availableBalance: '=,string',
							lockedBalances: [
								'lockedBalances',
								{
									module: '=,string',
									amount: '=,string',
								},
							],
						},
					],
					meta: {
						address: '=,string',
						count: '=,number',
						offset: '=,number',
						total: '=,number',
					},
					links: {},
				},
			},
			envelope: {
				data: [],
				meta: {},
			},
		},
	},
};

const getAllAPIsExpectedResponse = {
	ready: {
		envelope: {},
		rpcMethod: 'get.ready',
		source: {
			definition: {
				services: '=',
			},
			method: 'gateway.ready',
			params: {},
			type: 'moleculer',
		},
		swaggerApiPath: '/ready',
		version: '2.0',
	},
	status: {
		envelope: {},
		rpcMethod: 'get.status',
		source: {
			definition: {
				build: '=',
				chainID: '=',
				description: '=',
				name: '=',
				networkNodeVersion: '=',
				version: '=',
			},
			method: 'gateway.status',
			params: {},
			type: 'moleculer',
		},
		swaggerApiPath: '/status',
		version: '2.0',
	},
};

module.exports = {
	expectedResponseForRegisterHttpApi,
	expectedResponseForRegisterRpcApi,

	methodDefForTransformResponse,
	dataForTransformResponse,
	expectedResponseForTransformResponse,

	paramsForTransformRequest,
	methodDefForTransformRequest,
	expectedResponseForTransformRequest,

	sourceForMapParamWithType,

	paramsForTransformParams,
	specsForTransformParams,
	expectedResponseForTransformParams,

	sourceForMapParam,

	buildAPIAliasesPrefix,
	buildAPIAliasesMethods,
	buildAPIAliasesResponse,

	buildAPIAliasesPrefixWithFalseEtag,
	buildAPIAliasesMethodsWithFalseEtag,
	buildAPIAliasesWithFalseEtagResponse,

	getAllAPIsExpectedResponse,
};
