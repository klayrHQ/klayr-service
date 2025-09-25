const BluebirdPromise = require('bluebird');
const { Logger } = require('klayr-service-framework');

const { getPosValidators } = require('../../pos');
const { requestConnector } = require('../../../utils/request');

const logger = Logger();

const validatorRewardCache = new Map();

const reloadValidatorRewardCache = async () => {
	try {
		validatorRewardCache.clear();

		const allActiveValidators = await getPosValidators({ status: 'active' });

		for (let i = 0; i < allActiveValidators.data.length; i++) {
			const validator = allActiveValidators.data[i];
			const expectedReward = await requestConnector('getExpectedValidatorRewards', {
				validatorAddress: validator.address,
			});
			validatorRewardCache.set(validator.address, expectedReward);
		}
		logger.info(
			`Updated validator reward list cache with ${validatorRewardCache.size} active validators.`,
		);
	} catch (err) {
		logger.warn(`Failed to update validator reward cache due to: ${err.message}`);
		throw err;
	}
};

const getValidatorReward = async validatorAddress => {
	if (validatorRewardCache.size === 0) await reloadValidatorRewardCache();

	if (!validatorRewardCache.has(validatorAddress)) {
		return {
			blockReward: '0',
			dailyReward: '0',
			monthlyReward: '0',
			yearlyReward: '0',
		};
	}

	return validatorRewardCache.get(validatorAddress);
};

module.exports = { reloadValidatorRewardCache, getValidatorReward };
