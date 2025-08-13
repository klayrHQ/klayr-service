const {
	DB: {
		MySQL: { getTableInstance },
	},
	Logger,
} = require('klayr-service-framework');
const BluebirdPromise = require('bluebird');

const config = require('../../../../config');
const tokenBalancesTableSchema = require('../../../database/schema/tokenBalances');

const logger = Logger();

const MYSQL_ENDPOINT = config.endpoints.mysql;
const COMMIT_MAX_CONCURRENCY = 16;

const getTokenBalancesTable = () => getTableInstance(tokenBalancesTableSchema, MYSQL_ENDPOINT);

const balancesUpdatesMap = new Map();

const increaseTokenBalanceDB = async (address, tokenID, amount) => {
	const tokenBalancesTable = await getTokenBalancesTable();
	const numRowsAffected = await tokenBalancesTable.increment({
		increment: { balance: amount },
		where: { address, tokenID },
	});
	if (numRowsAffected === 0) {
		await tokenBalancesTable.upsert({
			address,
			tokenID,
			balance: amount,
		});
	}
};

const recordTokenBalanceAddition = (account, tokenID, addedBalance, isBlockDeletion) => {
	logger.debug(
		`Recording token balance addition for account: ${account}, tokenID: ${tokenID}, amount: ${addedBalance}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${account}:${tokenID}`;
	const currentBalance = balancesUpdatesMap.get(key) || 0n;
	const amountToAdd = BigInt(addedBalance);
	const newBalance = isBlockDeletion ? currentBalance - amountToAdd : currentBalance + amountToAdd;
	balancesUpdatesMap.set(key, newBalance);
};

const recordTokenBalanceRemoval = (account, tokenID, removedBalance, isBlockDeletion) => {
	logger.debug(
		`Recording token balance removal for account: ${account}, tokenID: ${tokenID}, amount: ${removedBalance}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${account}:${tokenID}`;
	const currentBalance = balancesUpdatesMap.get(key) || 0n;
	const amountToRemove = BigInt(removedBalance);
	const newBalance = isBlockDeletion
		? currentBalance + amountToRemove
		: currentBalance - amountToRemove;
	balancesUpdatesMap.set(key, newBalance);
};

const commitTokenBalanceIndex = async dbTrx => {
	if (balancesUpdatesMap.size === 0) {
		logger.trace('No token balance updates to commit.');
		return;
	}

	logger.debug(`Committing ${balancesUpdatesMap.size} token balance updates.`);
	const tokenBalancesTable = await getTokenBalancesTable();

	await BluebirdPromise.map(
		balancesUpdatesMap.entries(),
		async ([key, amount]) => {
			const [address, tokenID] = key.split(':');
			logger.trace(
				`Processing balance update for account: ${address}, tokenID: ${tokenID}, amount: ${amount}`,
			);

			let numRowsAffected;
			if (amount >= 0n) {
				logger.debug(
					`Incrementing balance for account: ${address}, tokenID: ${tokenID} by ${amount}`,
				);
				numRowsAffected = await tokenBalancesTable.increment(
					{
						increment: { balance: amount },
						where: { address, tokenID },
					},
					dbTrx,
				);
			}
			if (amount < 0n) {
				logger.debug(
					`Decrementing balance for account: ${address}, tokenID: ${tokenID} by ${amount * -1n}`,
				);
				numRowsAffected = await tokenBalancesTable.decrement(
					{
						decrement: { balance: amount * -1n },
						where: { address, tokenID },
					},
					dbTrx,
				);
			}
			if (numRowsAffected === undefined) {
				logger.debug(
					`Creating new token balance entry for account: ${address}, tokenID: ${tokenID} with balance: ${amount}`,
				);
				await tokenBalancesTable.upsert(
					{
						address,
						tokenID,
						balance: amount,
					},
					dbTrx,
				);
			}
		},
		{ concurrency: Math.min(balancesUpdatesMap.size, COMMIT_MAX_CONCURRENCY) },
	);

	balancesUpdatesMap.clear();
	logger.debug('Committed token balance updates successfully.');
};

module.exports = {
	recordTokenBalanceAddition,
	recordTokenBalanceRemoval,
	commitTokenBalanceIndex,
	increaseTokenBalanceDB,
};
