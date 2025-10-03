const accountSource = require('../../../sources/version3/account');
const envelope = require('../../../sources/version3/mappings/stdEnvelope');
const { transformParams, response, getSwaggerDescription } = require('../../../shared/utils');
const regex = require('../../../shared/regex');

module.exports = {
	version: '2.0',
	swaggerApiPath: '/account',
	rpcMethod: 'get.account',
	tags: ['Account'],
	params: {
		address: {
			optional: true,
			type: 'string',
			pattern: regex.ADDRESS_KLAYR32_CSV,
			max: 419,
			altSwaggerKey: 'addressCsv',
		},
		publicKey: { optional: true, type: 'string', pattern: regex.PUBLIC_KEY },
		name: {
			optional: true,
			type: 'string',
			pattern: regex.NAME_CSV,
			max: 209,
			altSwaggerKey: 'validatorNameCsv',
		},
		limit: { optional: true, type: 'number', min: 1, max: 100, default: 10 },
		offset: { optional: true, type: 'number', min: 0, default: 0 },
	},
	get schema() {
		const accountSchema = {};
		accountSchema[this.swaggerApiPath] = { get: {} };
		accountSchema[this.swaggerApiPath].get.tags = this.tags;
		accountSchema[this.swaggerApiPath].get.summary = 'Requests account data.';
		accountSchema[this.swaggerApiPath].get.description = getSwaggerDescription({
			rpcMethod: this.rpcMethod,
			description: 'Returns account data.',
		});
		accountSchema[this.swaggerApiPath].get.parameters = transformParams('Account', this.params);
		accountSchema[this.swaggerApiPath].get.responses = {
			200: {
				description: 'Returns a list of account data.',
				schema: {
					$ref: '#/definitions/accountWithEnvelope',
				},
			},
		};
		Object.assign(accountSchema[this.swaggerApiPath].get.responses, response);
		return accountSchema;
	},
	source: accountSource,
	envelope,
};
