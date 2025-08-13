module.exports = {
	tableName: 'token_locked',
	primaryKey: ['address', 'tokenID', 'module'],
	schema: {
		address: { type: 'string', null: false },
		tokenID: { type: 'string', null: false },
		module: { type: 'string', null: false },
		amount: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
	},
	indexes: {
		address: { type: 'key' },
		tokenID: { type: 'key' },
		module: { type: 'key' },
	},
	purge: {},
};
