module.exports = {
	tableName: 'token_balances',
	primaryKey: ['address', 'tokenID'],
	schema: {
		address: { type: 'string', length: 41, null: false },
		tokenID: { type: 'string', length: 16, null: false },
		availableBalance: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
		balance: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
	},
	indexes: {
		balance: { type: 'key' },
	},
	purge: {},
};
