module.exports = {
	tableName: 'token_account',
	primaryKey: ['address', 'tokenID'],
	schema: {
		address: { type: 'string', length: 41, null: false },
		tokenID: { type: 'string', length: 16, null: false },
		initialized: { type: 'boolean', null: false, defaultValue: false },
	},
	indexes: {},
	purge: {},
};
