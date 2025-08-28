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
const BluebirdPromise = require('bluebird');
const {
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const { getIndexedAccountInfo } = require('../../utils/account');
const { getAddressByName } = require('../../utils/validator');
const { parseToJSONCompatObj } = require('../../../utils/parser');
const { getKlayr32AddressFromPublicKey } = require('../../../utils/account');
const { indexAccountPublicKey } = require('../../../indexer/accountIndex');
const stakesTableSchema = require('../../../database/schema/stakes');

const config = require('../../../../config');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getStakesTable = () => getTableInstance(stakesTableSchema, MYSQL_ENDPOINT);

const getStakerDB = async address => {
	const stakesTable = await getStakesTable();
	const stakesData = await stakesTable.find({ stakerAddress: address }, [
		'validatorAddress',
		'amount',
	]);
	return stakesData;
};

const normalizeStake = stake => parseToJSONCompatObj(stake);

const getStakes = async params => {
	const stakesResponse = {
		data: {
			stakes: [],
		},
		meta: {
			staker: {},
			count: 0,
		},
	};

	if (!params.address && params.name) {
		params.address = await getAddressByName(params.name);
	}

	if (!params.address && params.publicKey) {
		params.address = getKlayr32AddressFromPublicKey(params.publicKey);

		// Index publicKey asynchronously
		indexAccountPublicKey(params.publicKey);
	}

	const stakerInfo = await getStakerDB(params.address);

	// Filter stakes by user specified search param (validator name) and add to response
	const accountInfoQueryFilter = {};
	if (params.search) {
		accountInfoQueryFilter.orSearch = [
			{
				property: 'name',
				pattern: params.search,
			},
			{
				property: 'address',
				pattern: params.search,
			},
			{
				property: 'publicKey',
				pattern: params.search,
			},
		];
	}

	await BluebirdPromise.map(
		stakerInfo,
		async stake => {
			const normalizedStake = normalizeStake(stake);
			// Get validator name filtered by user specified search param
			const { name: validatorName = null } = await getIndexedAccountInfo(
				{
					...accountInfoQueryFilter,
					address: normalizedStake.validatorAddress,
					isValidator: true,
				},
				['name'],
			);

			// Add validator to response
			if (validatorName) {
				stakesResponse.data.stakes.push({
					address: normalizedStake.validatorAddress,
					amount: normalizedStake.amount,
					name: validatorName,
				});
			}
		},
		{ concurrency: stakerInfo.length },
	);

	// Populate staker account name
	const accountInfo = await getIndexedAccountInfo({ address: params.address }, ['name']);
	stakesResponse.meta.staker = {
		address: params.address,
		name: accountInfo.name || null,
		publicKey: accountInfo.publicKey || params.publicKey || null,
	};

	stakesResponse.meta.count = stakesResponse.data.stakes.length;

	return stakesResponse;
};

module.exports = {
	getStakes,
};
