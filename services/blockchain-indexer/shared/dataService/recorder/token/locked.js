const {
	DB: {
		MySQL: { getTableInstance },
	},
	Logger,
} = require('klayr-service-framework');
const BluebirdPromise = require('bluebird');

const config = require('../../../../config');
const tokenLockedTableSchema = require('../../../database/schema/tokenLocked');
const tokenTotalLockedTableSchema = require('../../../database/schema/tokenTotalLocked');

const logger = Logger();

const MYSQL_ENDPOINT = config.endpoints.mysql;
const COMMIT_MAX_CONCURRENCY = 16;

const getTokenLockedTable = () => getTableInstance(tokenLockedTableSchema, MYSQL_ENDPOINT);
const getTokenTotalLockedTable = () =>
	getTableInstance(tokenTotalLockedTableSchema, MYSQL_ENDPOINT);

const lockedUpdatesMap = new Map();

const getLockedUpdatesMap = () => lockedUpdatesMap;

const getTotalLocked = async () => {
	const tokenTotalLockedTable = await getTokenTotalLockedTable();
	const data = await tokenTotalLockedTable.find({}, ['tokenID', 'module', 'total']);
	return data;
};

const getLockedBalance = async (address, tokenID) => {
	const tokenLockedTable = await getTokenLockedTable();
	const params = tokenID ? { address, tokenID } : { address };
	const data = await tokenLockedTable.find(params, ['module', 'amount']);
	return data;
};

const getLockedBalanceByModule = async (address, tokenID, module) => {
	const tokenLockedTable = await getTokenLockedTable();
	const params = { address, tokenID, module };
	const data = await tokenLockedTable.find(params, ['amount']);
	return data;
};

const increaseTokenLockedDB = async (address, tokenID, module, amount, dbTrx) => {
	const tokenLockedTable = await getTokenLockedTable();
	const numRowsAffected = await tokenLockedTable.increment(
		{
			increment: { amount },
			where: { address, tokenID, module },
		},
		dbTrx,
	);

	const tokenTotalLockedTable = await getTokenTotalLockedTable();
	const numTotalLockedRowsAffected = await tokenTotalLockedTable.increment(
		{
			increment: { total: amount },
			where: { tokenID, module },
		},
		dbTrx,
	);

	if (numRowsAffected === 0) {
		await tokenLockedTable.upsert(
			{
				address,
				tokenID,
				module,
				amount,
			},
			dbTrx,
		);
	}

	if (numTotalLockedRowsAffected === 0) {
		await tokenTotalLockedTable.upsert(
			{
				tokenID,
				module,
				total: amount,
			},
			dbTrx,
		);
	}
};

const recordTokenLocked = (account, tokenID, module, amountLocked, isBlockDeletion) => {
	logger.debug(
		`Recording token locked balance for account: ${account}, tokenID: ${tokenID}, module: ${module}, amount: ${amountLocked}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${account}:${tokenID}:${module}`;
	const currentBalance = lockedUpdatesMap.get(key) || 0n;
	const amountToAdd = BigInt(amountLocked);
	const newBalance = isBlockDeletion ? currentBalance - amountToAdd : currentBalance + amountToAdd;
	lockedUpdatesMap.set(key, newBalance);
};

const recordTokenUnlocked = (account, tokenID, module, amountUnlocked, isBlockDeletion) => {
	logger.debug(
		`Recording token unlocked balance for account: ${account}, tokenID: ${tokenID}, module: ${module}, amount: ${amountUnlocked}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${account}:${tokenID}:${module}`;
	const currentBalance = lockedUpdatesMap.get(key) || 0n;
	const amountToRemove = BigInt(amountUnlocked);
	const newBalance = isBlockDeletion
		? currentBalance + amountToRemove
		: currentBalance - amountToRemove;
	lockedUpdatesMap.set(key, newBalance);
};

const commitTokenLockedIndex = async dbTrx => {
	if (lockedUpdatesMap.size === 0) {
		logger.trace('No token locked balance updates to commit.');
		return;
	}

	logger.debug(`Committing ${lockedUpdatesMap.size} token locked balance updates.`);
	const tokenLockedTable = await getTokenLockedTable();
	const tokenTotalLockedTable = await getTokenTotalLockedTable();

	await BluebirdPromise.map(
		lockedUpdatesMap.entries(),
		async ([key, amount]) => {
			const [address, tokenID, module] = key.split(':');
			logger.trace(
				`Processing locked balance update for account: ${address}, tokenID: ${tokenID}, module: ${module}, amount: ${amount}`,
			);

			let numRowsAffected = 0;
			let numTotalLockedRowsAffected = 0;

			if (amount >= 0n) {
				logger.debug(
					`Incrementing locked balance for account: ${address}, tokenID: ${tokenID}, module: ${module} by ${amount}`,
				);
				numRowsAffected = await tokenLockedTable.increment(
					{
						increment: { amount },
						where: { address, tokenID, module },
					},
					dbTrx,
				);
				numTotalLockedRowsAffected = await tokenTotalLockedTable.increment(
					{
						increment: { total: amount },
						where: { tokenID, module },
					},
					dbTrx,
				);
			}
			if (amount < 0n) {
				logger.debug(
					`Decrementing locked balance for account: ${address}, tokenID: ${tokenID}, module: ${module} by ${
						amount * -1n
					}`,
				);
				numRowsAffected = await tokenLockedTable.decrement(
					{
						decrement: { amount: amount * -1n },
						where: { address, tokenID, module },
					},
					dbTrx,
				);
				numTotalLockedRowsAffected = await tokenTotalLockedTable.decrement(
					{
						decrement: { total: amount * -1n },
						where: { tokenID, module },
					},
					dbTrx,
				);
			}
			if (numRowsAffected === 0) {
				logger.debug(
					`Creating new token locked balance entry for account: ${address}, tokenID: ${tokenID}, module: ${module} with balance: ${amount}`,
				);
				await tokenLockedTable.upsert(
					{
						address,
						tokenID,
						module,
						amount,
					},
					dbTrx,
				);
			}
			if (numTotalLockedRowsAffected === 0) {
				logger.debug(
					`Creating new token total locked balance entry for tokenID: ${tokenID}, module: ${module} with total: ${amount}`,
				);
				await tokenTotalLockedTable.upsert(
					{
						tokenID,
						module,
						total: amount,
					},
					dbTrx,
				);
			}
		},
		{ concurrency: Math.min(lockedUpdatesMap.size, COMMIT_MAX_CONCURRENCY) },
	);

	lockedUpdatesMap.clear();
	logger.debug('Committed token locked balance updates successfully.');
};

module.exports = {
	getLockedUpdatesMap,
	getTotalLocked,
	getLockedBalanceByModule,
	getLockedBalance,
	recordTokenLocked,
	recordTokenUnlocked,
	commitTokenLockedIndex,
	increaseTokenLockedDB,
};
