const { getDatabaseSchema } = require('../../shared/dataService');

module.exports = [
	{
		name: 'getDatabaseSchema',
		controller: async ({ fileName }) => getDatabaseSchema(fileName),
		params: {
			fileName: { optional: false, type: 'string' },
		},
	},
];
