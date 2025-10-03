const searchSource = require('../../../sources/version3/search');
const envelope = require('../../../sources/version3/mappings/stdEnvelope');
const { transformParams, response, getSwaggerDescription } = require('../../../shared/utils');
const regex = require('../../../shared/regex');

module.exports = {
	version: '2.0',
	swaggerApiPath: '/search',
	rpcMethod: 'get.search',
	tags: ['Search'],
	params: {
		search: {
			optional: true,
			type: 'string',
			min: 1,
			pattern: regex.PARTIAL_SEARCH,
			altSwaggerKey: 'searchByNameAddressID',
		},
	},
	get schema() {
		const searchSchema = {};
		searchSchema[this.swaggerApiPath] = { get: {} };
		searchSchema[this.swaggerApiPath].get.tags = this.tags;
		searchSchema[this.swaggerApiPath].get.summary = 'Requests search data.';
		searchSchema[this.swaggerApiPath].get.description = getSwaggerDescription({
			rpcMethod: this.rpcMethod,
			description: 'Returns search data.',
		});
		searchSchema[this.swaggerApiPath].get.parameters = transformParams('Search', this.params);
		searchSchema[this.swaggerApiPath].get.responses = {
			200: {
				description: 'Returns a list of search data.',
				schema: {
					$ref: '#/definitions/searchWithEnvelope',
				},
			},
		};
		Object.assign(searchSchema[this.swaggerApiPath].get.responses, response);
		return searchSchema;
	},
	source: searchSource,
	envelope,
};
