module.exports = {
	tableName: 'auth',
	primaryKey: ['address'],
	schema: {
		address: { type: 'string', null: false },
		nonce: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
		numberOfSignatures: { type: 'integer', null: false },
		mandatoryKeys: { type: 'json' },
		optionalKeys: { type: 'json' },
	},
	indexes: {
		address: { type: 'key' },
	},
	purge: {},
};
