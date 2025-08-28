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

module.exports = {
	hasWaited,
	isPunished,
	isCertificateGenerated,
	isEligibleUnlock,
};
