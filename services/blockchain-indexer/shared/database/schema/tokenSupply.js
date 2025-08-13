module.exports = {
	tableName: 'token_supply',
	primaryKey: ['tokenID'],
	schema: {
		tokenID: { type: 'string', null: false },
		totalSupply: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
	},
	indexes: {
		tokenID: { type: 'key' },
	},
	purge: {},
};
