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
const tokenBalancesTableSchema = require('../../../database/schema/tokenBalances');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getTokenBalancesTable = () => getTableInstance(tokenBalancesTableSchema, MYSQL_ENDPOINT);

const getAvailableTokenIDs = async (params = {}) => {
	const response = {
		data: {},
		meta: {},
	};
	const tokenBalancesTable = await getTokenBalancesTable();

	const tokenInfos = await tokenBalancesTable.find({ ...params, distinct: 'tokenID' }, ['tokenID']);

	response.data.tokenIDs = tokenInfos.map(tokenInfo => tokenInfo.tokenID);
	response.meta = {
		count: response.data.tokenIDs.length,
		offset: params.offset,
		total: Number(await tokenBalancesTable.count({ distinct: 'tokenID' })),
	};

	return response;
};

module.exports = {
	getAvailableTokenIDs,
};
