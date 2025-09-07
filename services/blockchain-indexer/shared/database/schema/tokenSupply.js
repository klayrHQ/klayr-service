module.exports = {
	tableName: 'token_supply',
	primaryKey: ['tokenID'],
	schema: {
		tokenID: { type: 'string', null: false },
		amount: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
	},
	indexes: {
		tokenID: { type: 'key' },
	},
	purge: {},
};
