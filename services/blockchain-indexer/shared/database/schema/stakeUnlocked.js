module.exports = {
	tableName: 'stake_unlocked',
	primaryKey: ['validatorAddress', 'stakerAddress', 'unlockHeight'],
	schema: {
		stakerAddress: { type: 'string' },
		validatorAddress: { type: 'string' },
		unlockHeight: { type: 'integer' },
		amount: { type: 'bigInteger' },
		unstakeHeight: { type: 'integer' },
	},
	indexes: {
		validatorAddress: { type: 'key' },
		stakerAddress: { type: 'key' },
		unlockHeight: { type: 'key' },
	},
	purge: {},
};
