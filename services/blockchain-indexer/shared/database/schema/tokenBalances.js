module.exports = {
	tableName: 'token_balances',
	primaryKey: ['address', 'tokenID'],
	schema: {
		address: { type: 'string', null: false },
		tokenID: { type: 'string', null: false },
		availableBalance: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
		balance: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
	},
	indexes: {
		address: { type: 'key' },
		tokenID: { type: 'key' },
		balance: { type: 'key' },
	},
	purge: {},
};
