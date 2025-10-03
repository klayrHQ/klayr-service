const validatorsStatusCountSource = require('../../../../../sources/version3/posValidatorsStatusCount');
const envelope = require('../../../../../sources/version3/mappings/stdEnvelope');
const { transformParams, response, getSwaggerDescription } = require('../../../../../shared/utils');

module.exports = {
	version: '2.0',
	swaggerApiPath: '/pos/validators/status-count',
	rpcMethod: 'get.pos.validators.count',
	tags: ['PoS'],
	params: {},
	get schema() {
		const validatorsSchema = {};
		validatorsSchema[this.swaggerApiPath] = { get: {} };
		validatorsSchema[this.swaggerApiPath].get.tags = this.tags;
		validatorsSchema[this.swaggerApiPath].get.summary = 'Requests validators status count.';
		validatorsSchema[this.swaggerApiPath].get.description = getSwaggerDescription({
			rpcMethod: this.rpcMethod,
			description: 'Returns validators status count.',
		});
		validatorsSchema[this.swaggerApiPath].get.parameters = transformParams('PoS', this.params);
		validatorsSchema[this.swaggerApiPath].get.responses = {
			200: {
				description: 'Returns an object with the count of validators status.',
				schema: {
					$ref: '#/definitions/validatorsStatusCountWithEnvelope',
				},
			},
		};
		Object.assign(validatorsSchema[this.swaggerApiPath].get.responses, response);
		return validatorsSchema;
	},
	source: validatorsStatusCountSource,
	envelope,
};
