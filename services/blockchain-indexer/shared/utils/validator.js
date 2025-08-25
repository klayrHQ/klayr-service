/*
 * Klayrhq/klayrservice
 * Copyright © 2020 Lisk Foundation
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
	CacheRedis,
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const config = require('../../config');
const accountsTableSchema = require('../database/schema/accounts');
const validatorsTableSchema = require('../database/schema/validators');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const validatorCache = CacheRedis('validator', config.endpoints.cache);

const getAccountsTable = () => getTableInstance(accountsTableSchema, MYSQL_ENDPOINT);
const getValidatorsTable = () => getTableInstance(validatorsTableSchema, MYSQL_ENDPOINT);

const getNameByAddress = async address => {
	if (address) {
		const name = await validatorCache.get(address);
		if (name) {
			// Update the account index with the name asynchronously
			const accountsTable = await getAccountsTable();
			accountsTable.upsert({ address, name });

			// Update the validator index with the name asynchronously
			const validatorsTable = await getValidatorsTable();
			validatorsTable.upsert({ address, name });

			return name;
		}
	}
	return null;
};

module.exports = {
	getNameByAddress,
};
