module.exports = {
	tableName: 'token_account',
	primaryKey: ['address', 'tokenID'],
	schema: {
		address: { type: 'string', null: false },
		tokenID: { type: 'string', null: false },
		initialized: { type: 'boolean', null: false, defaultValue: false },
	},
	indexes: {
		address: { type: 'key' },
		tokenID: { type: 'key' },
	},
	purge: {},
};
