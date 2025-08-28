/*
 * Klayrhq/klayrservice
 * Copyright © 2022 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
const {
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const { TRANSACTION_STATUS, getGenesisHeight } = require('../../../constants');
const pendingUnlocksTableSchema = require('../../../database/schema/pendingUnlocks');
const validatorsTableSchema = require('../../../database/schema/validators');
const stakeUnlockedTableSchema = require('../../../database/schema/stakeUnlocked');
const { isEligibleUnlock } = require('../../utils/pos');
const {
	getPosPunishmentLockingPeriods,
	getPosRoundLength,
} = require('../../../dataService/business/pos/constants');

const config = require('../../../../config');
const MYSQL_ENDPOINT = config.endpoints.mysql;
const getPendingUnlocksTable = () => getTableInstance(pendingUnlocksTableSchema, MYSQL_ENDPOINT);
const getValidatorsTable = () => getTableInstance(validatorsTableSchema, MYSQL_ENDPOINT);
const getStakeUnlockedTable = () => getTableInstance(stakeUnlockedTableSchema, MYSQL_ENDPOINT);

// Command specific constants
const COMMAND_NAME = 'unlock';

// eslint-disable-next-line no-unused-vars
const applyTransaction = async (blockHeader, tx, events, dbTrx) => {
	if (tx.executionStatus !== TRANSACTION_STATUS.SUCCESSFUL) return;

	const validatorsTable = await getValidatorsTable();
	const pendingUnlocksTable = await getPendingUnlocksTable();
	const stakeUnlockedTable = await getStakeUnlockedTable();

	const senderAddress = tx.senderAddress;
	const height = tx.height;
	const punishmentLockingPeriods = await getPosPunishmentLockingPeriods();
	const roundLength = await getPosRoundLength();
	const aggregateCommitHeight = blockHeader.aggregateCommit.height;
	const genesisHeight = getGenesisHeight();

	const pendingUnlocksData = await pendingUnlocksTable.find({ stakerAddress: senderAddress }, [
		'validatorAddress',
		'amount',
		'unstakeHeight',
	]);

	for (let i = 0; i < pendingUnlocksData.length; i++) {
		const unlockObject = pendingUnlocksData[i];
		const [data = {}] = await validatorsTable.find({ address: unlockObject.validatorAddress }, [
			'reportMisbehaviorHeights',
		]);
		const reportMisbehaviorHeights = JSON.parse(data.reportMisbehaviorHeights || '[]');

		if (
			isEligibleUnlock(
				unlockObject,
				senderAddress,
				height,
				punishmentLockingPeriods,
				reportMisbehaviorHeights,
				genesisHeight,
				roundLength,
				aggregateCommitHeight,
			)
		) {
			await pendingUnlocksTable.deleteByPrimaryKey(
				{
					stakerAddress: senderAddress,
					validatorAddress: unlockObject.validatorAddress,
				},
				dbTrx,
			);

			await stakeUnlockedTable.upsert({
				stakerAddress: senderAddress,
				validatorAddress: unlockObject.validatorAddress,
				unlockHeight: height,
				amount: unlockObject.amount,
				unstakeHeight: unlockObject.unstakeHeight,
			});
		}
	}
};

// eslint-disable-next-line no-unused-vars
const revertTransaction = async (blockHeader, tx, events, dbTrx) => {
	if (tx.executionStatus !== TRANSACTION_STATUS.SUCCESSFUL) return;

	const validatorsTable = await getValidatorsTable();
	const pendingUnlocksTable = await getPendingUnlocksTable();
	const stakeUnlockedTable = await getStakeUnlockedTable();

	const senderAddress = tx.senderAddress;
	const height = tx.height;
	const punishmentLockingPeriods = await getPosPunishmentLockingPeriods();
	const roundLength = await getPosRoundLength();
	const aggregateCommitHeight = blockHeader.aggregateCommit.height;
	const genesisHeight = getGenesisHeight();

	const stakeUnlockedData = await stakeUnlockedTable.find(
		{ stakerAddress: senderAddress, unlockHeight: height },
		['validatorAddress', 'amount', 'unstakeHeight'],
	);

	for (let i = 0; i < stakeUnlockedData.length; i++) {
		const unlockObject = stakeUnlockedData[i];
		const [data = {}] = await validatorsTable.find({ address: unlockObject.validatorAddress }, [
			'reportMisbehaviorHeights',
		]);
		const reportMisbehaviorHeights = JSON.parse(data.reportMisbehaviorHeights || '[]');

		if (
			isEligibleUnlock(
				unlockObject,
				senderAddress,
				height,
				punishmentLockingPeriods,
				reportMisbehaviorHeights,
				genesisHeight,
				roundLength,
				aggregateCommitHeight,
			)
		) {
			await pendingUnlocksTable.upsert({
				stakerAddress: senderAddress,
				validatorAddress: unlockObject.validatorAddress,
				amount: unlockObject.amount,
				unstakeHeight: unlockObject.unstakeHeight,
			});

			await stakeUnlockedTable.deleteByPrimaryKey({
				stakerAddress: tx.senderAddress,
				validatorAddress: unlockObject.validatorAddress,
				unlockHeight: height,
			});
		}
	}
};

module.exports = {
	COMMAND_NAME,
	applyTransaction,
	revertTransaction,
};
