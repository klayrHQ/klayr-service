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

const config = require('../../../../config');
const accountTableSchema = require('../../../database/schema/accounts');
const tokenBalancesTableSchema = require('../../../database/schema/tokenBalances');

const { getAccountKnowledge } = require('../../knownAccounts');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getTokenBalancesTable = () => getTableInstance(tokenBalancesTableSchema, MYSQL_ENDPOINT);

const getTokenTopBalances = async params => {
	const response = {
		data: {},
		meta: {},
	};

	const tokenBalancesTable = await getTokenBalancesTable();

	const { search, tokenID, ...remParams } = params;
	params = remParams;

	params[`${tokenBalancesTableSchema.tableName}.tokenID`] = tokenID;

	params.leftOuterJoin = {
		targetTable: accountTableSchema.tableName,
		leftColumn: `${tokenBalancesTableSchema.tableName}.address`,
		rightColumn: `${accountTableSchema.tableName}.address`,
	};

	if (search) {
		params.orSearch = [
			{
				property: `${accountTableSchema.tableName}.name`,
				pattern: search,
			},
			{
				property: `${tokenBalancesTableSchema.tableName}.address`,
				pattern: search,
			},
			{
				property: `${accountTableSchema.tableName}.publicKey`,
				pattern: search,
			},
		];
	}

	const tokenInfos = await tokenBalancesTable.find(params, [
		`${tokenBalancesTableSchema.tableName}.balance`,
		`${tokenBalancesTableSchema.tableName}.availableBalance`,
		`${tokenBalancesTableSchema.tableName}.address`,
		`${accountTableSchema.tableName}.publicKey`,
		`${accountTableSchema.tableName}.name`,
	]);

	const filteredTokenInfos = [];
	// eslint-disable-next-line no-restricted-syntax
	for (const tokenInfo of tokenInfos) {
		const knowledge = getAccountKnowledge(tokenInfo.address);

		filteredTokenInfos.push({
			address: tokenInfo.address,
			publicKey: tokenInfo.publicKey,
			name: tokenInfo.name,
			balance: tokenInfo.balance.toString(),
			availableBalance: tokenInfo.availableBalance.toString(),
			lockedBalance: (BigInt(tokenInfo.balance) - BigInt(tokenInfo.availableBalance)).toString(),
			knowledge,
		});
	}

	response.data[tokenID] = filteredTokenInfos;

	response.meta = {
		count: response.data[tokenID].length,
		offset: params.offset,
		total: Number(
			await tokenBalancesTable.count(params, [`${tokenBalancesTableSchema.tableName}.address`]),
		),
	};

	return response;
};

module.exports = {
	getTokenTopBalances,
};
