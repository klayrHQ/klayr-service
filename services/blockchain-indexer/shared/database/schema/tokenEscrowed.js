module.exports = {
	tableName: 'token_escrowed',
	primaryKey: ['escrowChainID', 'tokenID'],
	schema: {
		escrowChainID: { type: 'string', null: false },
		tokenID: { type: 'string', null: false },
		balance: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
	},
	indexes: {
		escrowChainID: { type: 'key' },
		tokenID: { type: 'key' },
	},
	purge: {},
};
