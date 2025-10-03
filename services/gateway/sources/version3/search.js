const search = require('./mappings/search');

module.exports = {
	type: 'moleculer',
	method: 'indexer.search',
	params: {
		search: '=,string',
	},
	definition: {
		data: search,
		meta: {},
	},
};
