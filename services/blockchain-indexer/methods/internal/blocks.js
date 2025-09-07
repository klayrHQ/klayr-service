const {
	getBlocksByHeightBetween,
	getBlockByHeight,
	getBlockByID,
	getBlocksByIDs,
} = require('../../shared/dataService/business/blocks');

module.exports = [
	{
		name: 'getBlockByHeight',
		controller: async ({ height }) => getBlockByHeight(height),
		params: {
			height: { optional: false, type: 'number' },
		},
	},
	{
		name: 'getBlocksByHeightBetween',
		controller: async ({ from, to }) => getBlocksByHeightBetween({ from, to }),
		params: {
			from: { optional: false, type: 'number' },
			to: { optional: false, type: 'number' },
		},
	},
	{
		name: 'getBlockByID',
		controller: async ({ id }) => getBlockByID(id),
		params: {
			id: { optional: false, type: 'string' },
		},
	},
	{
		name: 'getBlocksByIDs',
		controller: async ({ ids }) => getBlocksByIDs(ids),
		params: {
			ids: { optional: false, type: 'array', items: 'string' },
		},
	},
];
