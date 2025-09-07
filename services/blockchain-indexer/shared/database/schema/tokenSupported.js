module.exports = {
	tableName: 'token_supported',
	primaryKey: ['tokenID', 'chainID'],
	schema: {
		tokenID: { type: 'string', null: false, defaultValue: '*' },
		chainID: { type: 'string', null: true },
	},
	indexes: {
		tokenID: { type: 'key' },
		chainID: { type: 'key' },
	},
	purge: {},
};
