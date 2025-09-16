module.exports = {
	tableName: 'token_supply',
	primaryKey: ['tokenID'],
	schema: {
		tokenID: { type: 'string', length: 16, null: false },
		amount: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
	},
	indexes: {},
	purge: {},
};
