const {
	DB: {
		MySQL: { getTableInstance },
	},
	Logger,
} = require('klayr-service-framework');
const BluebirdPromise = require('bluebird');

const config = require('../../../../config');
const tokenLockedTableSchema = require('../../../database/schema/tokenLocked');

const logger = Logger();

const MYSQL_ENDPOINT = config.endpoints.mysql;
const COMMIT_MAX_CONCURRENCY = 16;

const getTokenLockedTable = () => getTableInstance(tokenLockedTableSchema, MYSQL_ENDPOINT);

const lockedUpdatesMap = new Map();

const increaseTokenLockedDB = async (address, tokenID, module, amount) => {
	const tokenLockedTable = await getTokenLockedTable();
	const numRowsAffected = await tokenLockedTable.increment({
		increment: { amount },
		where: { address, tokenID, module },
	});
	if (numRowsAffected === 0) {
		await tokenLockedTable.upsert({
			address,
			tokenID,
			module,
			amount,
		});
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

	await BluebirdPromise.map(
		lockedUpdatesMap.entries(),
		async ([key, amount]) => {
			const [address, tokenID, module] = key.split(':');
			logger.trace(
				`Processing locked balance update for account: ${address}, tokenID: ${tokenID}, module: ${module}, amount: ${amount}`,
			);

			let numRowsAffected = 0;
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
		},
		{ concurrency: Math.min(lockedUpdatesMap.size, COMMIT_MAX_CONCURRENCY) },
	);

	lockedUpdatesMap.clear();
	logger.debug('Committed token locked balance updates successfully.');
};

module.exports = {
	recordTokenLocked,
	recordTokenUnlocked,
	commitTokenLockedIndex,
	increaseTokenLockedDB,
};
