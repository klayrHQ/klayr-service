module.exports = {
	tableName: 'token_summary',
	primaryKey: 'key',
	schema: {
		key: { type: 'string' },
		value: { type: 'bigInteger', defaultValue: BigInt('0') },
	},
	indexes: {
		key: { type: 'key' },
	},
	purge: {},
};
