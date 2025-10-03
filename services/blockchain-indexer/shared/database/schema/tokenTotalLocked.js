module.exports = {
	tableName: 'token_total_locked',
	primaryKey: ['tokenID', 'module'],
	schema: {
		tokenID: { type: 'string', length: 16, null: false },
		module: { type: 'string', length: 32, null: false },
		total: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
	},
	indexes: {},
	purge: {},
};
