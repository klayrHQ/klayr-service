const {
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const config = require('../../../config');
const validatorsTableSchema = require('../../database/schema/validators');
const { getPosPunishmentLockingPeriods } = require('../../dataService/business/pos/constants');
const { JSONParseDB } = require('../../dataService/utils/json');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getValidatorsTable = () => getTableInstance(validatorsTableSchema, MYSQL_ENDPOINT);

const getWaitTime = (senderAddress, validatorAddress, punishmentLockingPeriods) =>
	validatorAddress === senderAddress
		? punishmentLockingPeriods.lockingPeriodSelfStaking
		: punishmentLockingPeriods.lockingPeriodStaking;

const getPunishTime = (senderAddress, validatorAddress, punishmentLockingPeriods) =>
	validatorAddress === senderAddress
		? punishmentLockingPeriods.punishmentWindowSelfStaking
		: punishmentLockingPeriods.punishmentWindowStaking;

const hasWaited = (unlockingObject, senderAddress, height, punishmentLockingPeriods) => {
	const delayedAvailability = getWaitTime(
		senderAddress,
		unlockingObject.validatorAddress,
		punishmentLockingPeriods,
	);

	return !(height - unlockingObject.unstakeHeight < delayedAvailability);
};

const isPunished = (
	unlockingObject,
	pomHeights,
	senderAddress,
	height,
	punishmentLockingPeriods,
) => {
	if (!pomHeights.length) {
		return false;
	}

	const lastPomHeight = pomHeights[pomHeights.length - 1];
	const waitTime = getWaitTime(
		senderAddress,
		unlockingObject.validatorAddress,
		punishmentLockingPeriods,
	);
	const punishTime = getPunishTime(
		senderAddress,
		unlockingObject.validatorAddress,
		punishmentLockingPeriods,
	);
	return (
		height - lastPomHeight < punishTime && lastPomHeight < unlockingObject.unstakeHeight + waitTime
	);
};

const lastHeightOfRound = (height, genesisHeight, roundLength) => {
	const roundNumber = Math.ceil((height - genesisHeight) / roundLength);

	return roundNumber * roundLength + genesisHeight;
};

const isCertificateGenerated = options =>
	lastHeightOfRound(
		options.unlockObject.unstakeHeight + 2 * options.roundLength,
		options.genesisHeight,
		options.roundLength,
	) <= options.maxHeightCertified;

const isEligibleUnlock = (
	unlockObject,
	senderAddress,
	height,
	punishmentLockingPeriods,
	reportMisbehaviorHeights,
	genesisHeight,
	roundLength,
	aggregateCommitHeight,
) => {
	return (
		hasWaited(unlockObject, senderAddress, height, punishmentLockingPeriods) &&
		!isPunished(
			unlockObject,
			reportMisbehaviorHeights,
			senderAddress,
			height,
			punishmentLockingPeriods,
		) &&
		isCertificateGenerated({
			unlockObject,
			genesisHeight,
			maxHeightCertified: aggregateCommitHeight,
			roundLength,
		})
	);
};

const getExpectedUnlockHeight = async (stakerAddress, validatorAddress, unstakeHeight) => {
	const validatorAccount = { reportMisbehaviorHeights: [] };

	const validatorsTable = await getValidatorsTable();
	const validatorAccountData = await validatorsTable.find({ address: validatorAddress, limit: 1 }, [
		'reportMisbehaviorHeights',
	]);
	if (validatorAccountData.length === 1) {
		validatorAccount.reportMisbehaviorHeights = JSONParseDB(
			validatorAccountData[0].reportMisbehaviorHeights || '[]',
		);
	}

	const punishmentLockingPeriods = await getPosPunishmentLockingPeriods();
	const waitTime =
		getWaitTime(stakerAddress, validatorAddress, punishmentLockingPeriods) + unstakeHeight;
	if (!validatorAccount.reportMisbehaviorHeights.length) {
		return waitTime;
	}

	const lastPomHeight =
		validatorAccount.reportMisbehaviorHeights[validatorAccount.reportMisbehaviorHeights.length - 1];

	// if last pom height is greater than unstake height + wait time, the validator is not punished
	if (lastPomHeight >= unstakeHeight + waitTime) {
		return waitTime;
	}

	return Math.max(
		getPunishTime(stakerAddress, validatorAddress, punishmentLockingPeriods) + lastPomHeight,
		waitTime,
	);
};

module.exports = {
	hasWaited,
	isPunished,
	isCertificateGenerated,
	isEligibleUnlock,
	getExpectedUnlockHeight,
};
