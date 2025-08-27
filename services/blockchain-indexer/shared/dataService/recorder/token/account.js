/*
 * Klayr Service Monitor
 * Copyright © 2023 Klayr Holding
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with Klayr Holding,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const {
	DB: {
		MySQL: { getTableInstance },
	},
	Logger,
} = require('klayr-service-framework');
const BluebirdPromise = require('bluebird');

const config = require('../../../../config');
const tokenAccountSchema = require('../../../database/schema/tokenAccount');

const logger = Logger();

const MYSQL_ENDPOINT = config.endpoints.mysql;
const COMMIT_MAX_CONCURRENCY = 16;

const getTokenAccountTable = () => getTableInstance(tokenAccountSchema, MYSQL_ENDPOINT);

// The key is a string 'address:tokenID' and the value is the initialized status (boolean)
const accountUpdatesMap = new Map();

const getAccountInitialized = async (address, tokenID) => {
	const tokenAccountTable = await getTokenAccountTable();
	const data = await tokenAccountTable.find({ address, tokenID, limit: 1 }, ['initialized']);
	if (data.length && data[0].initialized) return true;
	return false;
};

const updateAccountInitializationDB = async (address, tokenID, dbTrx) => {
	const tokenAccountTable = await getTokenAccountTable();
	await tokenAccountTable.upsert(
		{
			address,
			tokenID,
			initialized: true,
		},
		dbTrx,
	);
};

const recordAccountInitialization = (address, tokenID, isBlockDeletion) => {
	logger.debug(
		`Recording account initialization for address: ${address}, tokenID: ${tokenID}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${address}:${tokenID}`;
	const finalState = !isBlockDeletion;
	accountUpdatesMap.set(key, finalState);
};

const recordAccountUninitialization = (address, tokenID, isBlockDeletion) => {
	logger.debug(
		`Recording account uninitialization for address: ${address}, tokenID: ${tokenID}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${address}:${tokenID}`;
	const finalState = !!isBlockDeletion;
	accountUpdatesMap.set(key, finalState);
};

const commitAccountIndex = async dbTrx => {
	if (accountUpdatesMap.size === 0) {
		logger.trace('No token account updates to commit.');
		return;
	}

	logger.debug(`Committing ${accountUpdatesMap.size} account updates.`);
	const tokenAccountTable = await getTokenAccountTable();

	await BluebirdPromise.map(
		accountUpdatesMap.entries(),
		async ([key, initialized]) => {
			const [address, tokenID] = key.split(':');
			if (initialized) {
				logger.trace(
					`Upserting token account entry for address: ${address}, tokenID: ${tokenID}, initialized: ${initialized}`,
				);
				await tokenAccountTable.upsert(
					{
						address,
						tokenID,
						initialized: true,
					},
					dbTrx,
				);
			} else {
				logger.trace(`Deleting token account entry for address: ${address}, tokenID: ${tokenID}`);
				await tokenAccountTable.deleteByPrimaryKey(
					{
						address,
						tokenID,
					},
					dbTrx,
				);
			}
		},
		{ concurrency: Math.min(accountUpdatesMap.size, COMMIT_MAX_CONCURRENCY) },
	);

	accountUpdatesMap.clear();
	logger.debug('Committed account updates successfully.');
};

module.exports = {
	getAccountInitialized,
	updateAccountInitializationDB,
	recordAccountInitialization,
	recordAccountUninitialization,
	commitAccountIndex,
};
