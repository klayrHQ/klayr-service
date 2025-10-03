module.exports = {
	tableName: 'token_locked',
	primaryKey: ['address', 'tokenID', 'module'],
	schema: {
		address: { type: 'string', length: 41, null: false },
		tokenID: { type: 'string', length: 16, null: false },
		module: { type: 'string', length: 32, null: false },
		amount: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
	},
	indexes: {},
	purge: {},
};
