const { getAccount } = require('./controllers/account');

module.exports = [
	{
		name: 'account',
		controller: getAccount,
		params: {
			address: { optional: true, type: 'string' },
			name: { optional: true, type: 'string' },
			publicKey: { optional: true, type: 'string' },
			limit: { optional: true, type: 'number' },
			offset: { optional: true, type: 'number' },
		},
	},
];
