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
	Logger,
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');
const { codec } = require('@klayr/codec');
const { reloadValidatorCache, getSchemas, getPosConstants } = require('../../../dataService');

const { TRANSACTION_STATUS } = require('../../../constants');
const validatorsTableSchema = require('../../../database/schema/validators');
const stakesTableSchema = require('../../../database/schema/stakes');

const logger = Logger();

const config = require('../../../../config');
const { JSONParseDB } = require('../../../dataService/utils/json');
const MYSQL_ENDPOINT = config.endpoints.mysql;

const getValidatorsTable = () => getTableInstance(validatorsTableSchema, MYSQL_ENDPOINT);
const getStakesTable = () => getTableInstance(stakesTableSchema, MYSQL_ENDPOINT);

// Command specific constants
const COMMAND_NAME = 'reportMisbehavior';

const getPosConstantsCache = async () => {
	const { data } = await getPosConstants();
	return data;
};

// eslint-disable-next-line no-unused-vars
const applyTransaction = async (blockHeader, tx, events, dbTrx) => {
	if (tx.executionStatus !== TRANSACTION_STATUS.SUCCESSFUL) return;

	const { data: schemas } = await getSchemas();
	const blockHeaderSchema = schemas.header.schema;

	const blockHeader1 = codec.decode(blockHeaderSchema, Buffer.from(tx.params.header1, 'hex'));
	const punishedAddress = blockHeader1.generatorAddress;

	const validatorsTable = await getValidatorsTable();
	const [validatorInfo = {}] = await validatorsTable.find({ address: punishedAddress, limit: 1 }, [
		'reportMisbehaviorHeights',
	]);
	const reportMisbehaviorHeights = JSONParseDB(validatorInfo.reportMisbehaviorHeights || '[]');
	reportMisbehaviorHeights.push(tx.height);

	await validatorsTable.upsert(
		{
			address: punishedAddress,
			reportMisbehaviorHeights,
		},
		dbTrx,
	);

	const stakesTable = await getStakesTable();
	const posConstants = await getPosConstantsCache();

	const [punishedAddressData = {}] = await stakesTable.find(
		{ stakerAddress: punishedAddress, validatorAddress: punishedAddress },
		['amount'],
	);
	const selfStake = BigInt(punishedAddressData.amount) || BigInt(0);

	const reward =
		BigInt(posConstants.reportMisbehaviorReward) > selfStake
			? selfStake
			: BigInt(posConstants.reportMisbehaviorReward);

	await stakesTable.decrement(
		{
			decrement: { amount: reward },
			where: { stakerAddress: punishedAddress, validatorAddress: punishedAddress },
		},
		dbTrx,
	);

	logger.debug('Reloading validators cache on reportMisbehavior transaction.');
	await reloadValidatorCache();
};

// eslint-disable-next-line no-unused-vars
const revertTransaction = async (blockHeader, tx, events, dbTrx) => {
	if (tx.executionStatus !== TRANSACTION_STATUS.SUCCESSFUL) return;

	const { data: schemas } = await getSchemas();
	const blockHeaderSchema = schemas.header.schema;

	const blockHeader1 = codec.decode(blockHeaderSchema, Buffer.from(tx.params.header1, 'hex'));
	const punishedAddress = blockHeader1.generatorAddress;

	const validatorsTable = await getValidatorsTable();
	const [validatorInfo = {}] = await validatorsTable.find({ address: punishedAddress, limit: 1 }, [
		'reportMisbehaviorHeights',
	]);
	const reportMisbehaviorHeights = JSONParseDB(validatorInfo.reportMisbehaviorHeights || '[]');

	const index = reportMisbehaviorHeights.indexOf(tx.height);
	if (index > -1) reportMisbehaviorHeights.splice(index, 1);

	await validatorsTable.upsert(
		{
			address: punishedAddress,
			reportMisbehaviorHeights,
		},
		dbTrx,
	);

	const stakesTable = await getStakesTable();
	const posConstants = await getPosConstantsCache();

	const [punishedAddressData = {}] = await stakesTable.find(
		{ stakerAddress: punishedAddress, validatorAddress: punishedAddress },
		['amount'],
	);
	const selfStake = BigInt(punishedAddressData.amount) || BigInt(0);

	const reward =
		BigInt(posConstants.reportMisbehaviorReward) > selfStake
			? selfStake
			: BigInt(posConstants.reportMisbehaviorReward);

	await stakesTable.increment(
		{
			increment: { amount: reward },
			where: { stakerAddress: punishedAddress, validatorAddress: punishedAddress },
		},
		dbTrx,
	);

	logger.debug('Reloading validators cache on reversal of reportMisbehavior transaction.');
	await reloadValidatorCache();
};

module.exports = {
	COMMAND_NAME,
	applyTransaction,
	revertTransaction,
};
