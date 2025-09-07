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

// The key is a string 'address:tokenID' and the value is an object { available: BigInt, total: BigInt }
const balancesUpdatesMap = new Map();

const getBalancesUpdatesMap = () => balancesUpdatesMap;

const getBalanceUpdate = key => {
	const balanceUpdate = balancesUpdatesMap.get(key) || { available: 0n, total: 0n };
	return balanceUpdate;
};

const getAvailableBalance = async (address, tokenID) => {
	const tokenBalancesTable = await getTokenBalancesTable();
	const params = tokenID ? { address, tokenID } : { address };
	const data = await tokenBalancesTable.find(params, ['address', 'tokenID', 'availableBalance']);
	return data;
};

const getTotalBalance = async (address, tokenID) => {
	const tokenBalancesTable = await getTokenBalancesTable();
	const params = tokenID ? { address, tokenID } : { address };
	const data = await tokenBalancesTable.find(params, ['address', 'tokenID', 'balance']);
	return data;
};

const increaseTokenBalanceDB = async (address, tokenID, amount, dbTrx) => {
	const tokenBalancesTable = await getTokenBalancesTable();
	const numRowsAffected = await tokenBalancesTable.increment(
		{
			increment: { availableBalance: amount, balance: amount },
			where: { address, tokenID },
		},
		dbTrx,
	);
	if (numRowsAffected === 0) {
		await tokenBalancesTable.upsert(
			{
				address,
				tokenID,
				availableBalance: amount,
				balance: amount,
			},
			dbTrx,
		);
	}
};

const increaseTokenTotalBalanceDB = async (address, tokenID, amount, dbTrx) => {
	const tokenBalancesTable = await getTokenBalancesTable();
	const numRowsAffected = await tokenBalancesTable.increment(
		{
			increment: { balance: amount },
			where: { address, tokenID },
		},
		dbTrx,
	);
	if (numRowsAffected === 0) {
		await tokenBalancesTable.upsert(
			{
				address,
				tokenID,
				availableBalance: amount,
				balance: amount,
			},
			dbTrx,
		);
	}
};

const recordTokenBalanceAddition = (account, tokenID, addedBalance, isBlockDeletion) => {
	logger.debug(
		`Recording token balance addition for account: ${account}, tokenID: ${tokenID}, amount: ${addedBalance}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${account}:${tokenID}`;
	const currentBalance = getBalanceUpdate(key);
	const amountToAdd = BigInt(addedBalance);

	const newAvailableBalance = isBlockDeletion
		? currentBalance.available - amountToAdd
		: currentBalance.available + amountToAdd;
	const newTotalBalance = isBlockDeletion
		? currentBalance.total - amountToAdd
		: currentBalance.total + amountToAdd;

	balancesUpdatesMap.set(key, { available: newAvailableBalance, total: newTotalBalance });
};

const recordTokenBalanceRemoval = (account, tokenID, removedBalance, isBlockDeletion) => {
	logger.debug(
		`Recording token balance removal for account: ${account}, tokenID: ${tokenID}, amount: ${removedBalance}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${account}:${tokenID}`;
	const currentBalance = getBalanceUpdate(key);
	const amountToRemove = BigInt(removedBalance);

	const newAvailableBalance = isBlockDeletion
		? currentBalance.available + amountToRemove
		: currentBalance.available - amountToRemove;
	const newTotalBalance = isBlockDeletion
		? currentBalance.total + amountToRemove
		: currentBalance.total - amountToRemove;

	balancesUpdatesMap.set(key, { available: newAvailableBalance, total: newTotalBalance });
};

const recordTokenAvailableBalanceAddition = (account, tokenID, addedBalance, isBlockDeletion) => {
	logger.debug(
		`Recording token available balance addition for account: ${account}, tokenID: ${tokenID}, amount: ${addedBalance}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${account}:${tokenID}`;
	const currentBalance = getBalanceUpdate(key);
	const amountToAdd = BigInt(addedBalance);

	const newAvailableBalance = isBlockDeletion
		? currentBalance.available - amountToAdd
		: currentBalance.available + amountToAdd;

	balancesUpdatesMap.set(key, { ...currentBalance, available: newAvailableBalance });
};

const recordTokenAvailableBalanceRemoval = (account, tokenID, removedBalance, isBlockDeletion) => {
	logger.debug(
		`Recording token available balance removal for account: ${account}, tokenID: ${tokenID}, amount: ${removedBalance}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${account}:${tokenID}`;
	const currentBalance = getBalanceUpdate(key);
	const amountToRemove = BigInt(removedBalance);

	const newAvailableBalance = isBlockDeletion
		? currentBalance.available + amountToRemove
		: currentBalance.available - amountToRemove;

	balancesUpdatesMap.set(key, { ...currentBalance, available: newAvailableBalance });
};

const recordTokenTotalBalanceAddition = (account, tokenID, addedBalance, isBlockDeletion) => {
	logger.debug(
		`Recording token total balance addition for account: ${account}, tokenID: ${tokenID}, amount: ${addedBalance}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${account}:${tokenID}`;
	const currentBalance = getBalanceUpdate(key);
	const amountToAdd = BigInt(addedBalance);

	const newTotalBalance = isBlockDeletion
		? currentBalance.total - amountToAdd
		: currentBalance.total + amountToAdd;

	balancesUpdatesMap.set(key, { ...currentBalance, total: newTotalBalance });
};

const recordTokenTotalBalanceRemoval = (account, tokenID, removedBalance, isBlockDeletion) => {
	logger.debug(
		`Recording token total balance removal for account: ${account}, tokenID: ${tokenID}, amount: ${removedBalance}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${account}:${tokenID}`;
	const currentBalance = getBalanceUpdate(key);
	const amountToRemove = BigInt(removedBalance);

	const newTotalBalance = isBlockDeletion
		? currentBalance.total + amountToRemove
		: currentBalance.total - amountToRemove;

	balancesUpdatesMap.set(key, { ...currentBalance, total: newTotalBalance });
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
		async ([key, balanceChange]) => {
			const [address, tokenID] = key.split(':');
			logger.trace(
				`Processing balance update for account: ${address}, tokenID: ${tokenID}, amount: ${JSON.stringify(
					balanceChange,
					(_, v) => (typeof v === 'bigint' ? v.toString() : v),
				)}`,
			);

			const increment = {};
			if (balanceChange.available >= 0n) increment.availableBalance = balanceChange.available;
			if (balanceChange.total >= 0n) increment.balance = balanceChange.total;

			const decrement = {};
			if (balanceChange.available < 0n) decrement.availableBalance = -balanceChange.available;
			if (balanceChange.total < 0n) decrement.balance = -balanceChange.total;

			let numRowsAffected = 0;
			if (Object.keys(increment).length) {
				logger.debug(
					`Incrementing token balance for account: ${address}, tokenID: ${tokenID}, available amount: ${increment.availableBalance}, total amount: ${increment.balance}`,
				);
				numRowsAffected = await tokenBalancesTable.increment(
					{ increment, where: { address, tokenID } },
					dbTrx,
				);
			}
			if (Object.keys(decrement).length) {
				logger.debug(
					`Decrementing token balance for account: ${address}, tokenID: ${tokenID}, available amount: ${decrement.availableBalance}, total amount: ${decrement.balance}`,
				);
				numRowsAffected = await tokenBalancesTable.decrement(
					{ decrement, where: { address, tokenID } },
					dbTrx,
				);
			}

			if (numRowsAffected === 0) {
				logger.debug(
					`Creating new token balance entry for account: ${address}, tokenID: ${tokenID}, available amount: ${balanceChange.available}, total amount: ${balanceChange.total}`,
				);
				await tokenBalancesTable.upsert(
					{
						address,
						tokenID,
						availableBalance: balanceChange.available,
						balance: balanceChange.total,
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
	getBalancesUpdatesMap,
	getAvailableBalance,
	getTotalBalance,
	recordTokenBalanceAddition,
	recordTokenBalanceRemoval,
	recordTokenAvailableBalanceAddition,
	recordTokenAvailableBalanceRemoval,
	recordTokenTotalBalanceAddition,
	recordTokenTotalBalanceRemoval,
	commitTokenBalanceIndex,
	increaseTokenBalanceDB,
	increaseTokenTotalBalanceDB,
};
