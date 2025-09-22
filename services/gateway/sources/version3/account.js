const account = require('./mappings/account');

module.exports = {
	type: 'moleculer',
	method: 'indexer.account',
	params: {
		address: '=,string',
		publicKey: '=,string',
		name: '=,string',
		offset: '=,number',
		limit: '=,number',
	},
	definition: {
		data: ['data', account],
		meta: {
			count: '=,number',
			offset: '=,number',
			total: '=,number',
		},
	},
};
