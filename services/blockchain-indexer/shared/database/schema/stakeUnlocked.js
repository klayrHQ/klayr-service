module.exports = {
	tableName: 'stake_unlocked',
	primaryKey: ['validatorAddress', 'stakerAddress', 'unlockHeight'],
	schema: {
		stakerAddress: { type: 'string', length: 41 },
		validatorAddress: { type: 'string', length: 41 },
		unlockHeight: { type: 'integer' },
		amount: { type: 'bigInteger' },
		unstakeHeight: { type: 'integer' },
	},
	indexes: {},
	purge: {},
};
