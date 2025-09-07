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
	Exceptions: { InvalidParamsException },
} = require('klayr-service-framework');

const {
	address: { getKlayr32AddressFromPublicKey },
} = require('@klayr/cryptography');

const config = require('../../../../config');

const validatorsTableSchema = require('../../../database/schema/validators');
const stakesTableSchema = require('../../../database/schema/stakes');
const pendingUnlocksTableSchema = require('../../../database/schema/pendingUnlocks');

const { getRewardTokenID } = require('../dynamicReward');
const { getLockedBalanceByModule } = require('../../recorder/token/locked');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getValidatorsTable = () => getTableInstance(validatorsTableSchema, MYSQL_ENDPOINT);
const getStakesTable = () => getTableInstance(stakesTableSchema, MYSQL_ENDPOINT);
const getPendingUnlocksTable = () => getTableInstance(pendingUnlocksTableSchema, MYSQL_ENDPOINT);

const getPosLockedRewardFromDB = async (address, tokenID) => {
	const lockedBalance = await getLockedBalanceByModule(address, tokenID, 'pos');
	const totalLockedBalance = lockedBalance.length
		? lockedBalance.reduce((acc, cur) => acc + BigInt(cur.amount), 0n)
		: 0n;

	const stakesTable = await getStakesTable();
	const stakesData = await stakesTable.find({ stakerAddress: address }, ['amount']);
	const totalStaked = stakesData.length
		? stakesData.reduce((acc, cur) => acc + BigInt(cur.amount), 0n)
		: 0n;

	const pendingUnlocksTable = await getPendingUnlocksTable();
	const pendingUnlocksData = await pendingUnlocksTable.find({ stakerAddress: address }, ['amount']);
	const totalPendingUnlocks = pendingUnlocksData.length
		? pendingUnlocksData.reduce((acc, cur) => acc + BigInt(cur.amount), 0n)
		: 0n;

	return totalLockedBalance - (totalStaked + totalPendingUnlocks);
};

const getPosLockedRewards = async params => {
	const response = {
		data: [],
		meta: {
			count: 0,
			offset: 0,
			total: 0,
		},
	};

	// Params must contain either address or name or publicKey
	if (!Object.keys(params).some(param => ['address', 'name', 'publicKey'].includes(param))) {
		throw new InvalidParamsException('One of the params (address, name or publicKey) is required.');
	}

	// Process address
	let { address } = params;
	if (!address && params.name) {
		const validatorsTable = await getValidatorsTable();

		const queryParams = {
			name: params.name,
			limit: 1,
		};

		const dataRows = await validatorsTable.find(queryParams, ['address']);
		if (dataRows.length) [{ address }] = dataRows;
	}
	if (!address && params.publicKey) {
		address = getKlayr32AddressFromPublicKey(Buffer.from(params.publicKey, 'hex'));
	}

	const tokenID = await getRewardTokenID();

	if (!address || !tokenID) {
		return response;
	}
	const reward = await getPosLockedRewardFromDB(address, tokenID);
	response.data.push({
		reward: reward.toString(),
		tokenID,
	});

	const totalResponseCount = response.data.length;
	response.data = response.data.slice(params.offset, params.offset + params.limit);

	response.meta = {
		count: response.data.length,
		offset: params.offset,
		total: totalResponseCount,
	};

	return response;
};

module.exports = {
	getPosLockedRewards,
};
