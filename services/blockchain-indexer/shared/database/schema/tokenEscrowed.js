module.exports = {
	tableName: 'token_escrowed',
	primaryKey: ['escrowChainID', 'tokenID'],
	schema: {
		escrowChainID: { type: 'string', length: 8, null: false },
		tokenID: { type: 'string', length: 16, null: false },
		amount: { type: 'bigInteger', null: false, defaultValue: BigInt('0') },
	},
	indexes: {},
	purge: {},
};
