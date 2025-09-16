module.exports = {
	tableName: 'token_supported',
	primaryKey: ['tokenID', 'chainID'],
	schema: {
		tokenID: { type: 'string', length: 16, null: false, defaultValue: '*' },
		chainID: { type: 'string', length: 8, null: true },
	},
	indexes: {},
	purge: {},
};
