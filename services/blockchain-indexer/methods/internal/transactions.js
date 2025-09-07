const {
	getTransactionByID,
	getTransactionsByIDs,
} = require('../../shared/dataService/business/transactions');

module.exports = [
	{
		name: 'getTransactionByID',
		controller: async ({ id }) => getTransactionByID(id),
		params: {
			id: { optional: false, type: 'string' },
		},
	},
	{
		name: 'getTransactionsByIDs',
		controller: async ({ ids }) => getTransactionsByIDs(ids),
		params: {
			ids: { optional: false, type: 'array', items: 'string' },
		},
	},
];
