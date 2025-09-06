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
	address: {
		getKlayr32AddressFromPublicKey: getKlayr32AddressFromPublicKeyHelper,
		getKlayr32AddressFromAddress: getKlayr32AddressFromAddressHelper,
	},
} = require('@klayr/cryptography');

const {
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const accountsTableSchema = require('../database/schema/accounts');
const validatorsTableSchema = require('../database/schema/validators');
const config = require('../../config');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const getAccountsTable = () => getTableInstance(accountsTableSchema, MYSQL_ENDPOINT);
const getValidatorsTable = () => getTableInstance(validatorsTableSchema, MYSQL_ENDPOINT);

const getKlayr32AddressFromHexAddress = address =>
	getKlayr32AddressFromAddressHelper(Buffer.from(address, 'hex'));

const getKlayr32AddressFromPublicKey = publicKey =>
	getKlayr32AddressFromPublicKeyHelper(Buffer.from(publicKey, 'hex'));

const updateAccountInfo = async params => {
	const accountInfo = {};
	for (let i = 0, keys = Object.keys(accountsTableSchema.schema); i < keys.length; i++) {
		if (keys[i] in params) accountInfo[keys[i]] = params[keys[i]];
	}

	const accountsTable = await getAccountsTable();
	await accountsTable.upsert(accountInfo);

	if (accountInfo.isValidator && accountInfo.name) {
		const validatorsTable = await getValidatorsTable();
		await validatorsTable.upsert(accountInfo);
	}
};

module.exports = {
	getKlayr32AddressFromPublicKey,
	getKlayr32AddressFromHexAddress,
	updateAccountInfo,
};
