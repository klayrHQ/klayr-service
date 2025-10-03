const { search } = require('./controllers/search');

module.exports = [
	{
		name: 'search',
		controller: search,
		params: {
			search: { optional: false, type: 'string' },
		},
	},
];
