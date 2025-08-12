const {
	DB: {
		MySQL: { getTableInstance },
	},
	Logger,
} = require('klayr-service-framework');
const BluebirdPromise = require('bluebird');

const config = require('../../../../config');
const tokenEscrowedTableSchema = require('../../../database/schema/tokenEscrowed');

const logger = Logger();

const MYSQL_ENDPOINT = config.endpoints.mysql;
const COMMIT_MAX_CONCURRENCY = 16;

const getTokenEscrowedTable = () => getTableInstance(tokenEscrowedTableSchema, MYSQL_ENDPOINT);

const escrowedUpdatesMap = new Map();

const recordTokenEscrowed = (escrowChainID, tokenID, escrowedBalance, isBlockDeletion) => {
	logger.debug(
		`Recording token escrowed for chainID: ${escrowChainID}, tokenID: ${tokenID}, amount: ${escrowedBalance}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${escrowChainID}:${tokenID}`;
	const currentBalance = escrowedUpdatesMap.get(key) || 0n;
	const amountToAdd = BigInt(escrowedBalance);
	const newBalance = isBlockDeletion ? currentBalance - amountToAdd : currentBalance + amountToAdd;
	escrowedUpdatesMap.set(key, newBalance);
};

const recordTokenUnescrowed = (escrowChainID, tokenID, unescrowedBalance, isBlockDeletion) => {
	logger.debug(
		`Recording token unescrowed for chainID: ${escrowChainID}, tokenID: ${tokenID}, amount: ${unescrowedBalance}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = `${escrowChainID}:${tokenID}`;
	const currentBalance = escrowedUpdatesMap.get(key) || 0n;
	const amountToRemove = BigInt(unescrowedBalance);
	const newBalance = isBlockDeletion
		? currentBalance + amountToRemove
		: currentBalance - amountToRemove;
	escrowedUpdatesMap.set(key, newBalance);
};

const commitTokenEscrowedIndex = async dbTrx => {
	if (escrowedUpdatesMap.size === 0) {
		logger.trace('No token escrowed balance updates to commit.');
		return;
	}

	logger.debug(`Committing ${escrowedUpdatesMap.size} token escrowed balance updates.`);
	const tokenEscrowedTable = await getTokenEscrowedTable();

	await BluebirdPromise.map(
		escrowedUpdatesMap.entries(),
		async ([key, amount]) => {
			const [escrowChainID, tokenID] = key.split(':');
			logger.trace(
				`Processing escrowed balance update for chainID: ${escrowChainID}, tokenID: ${tokenID}, amount: ${amount}`,
			);

			let numRowsAffected;
			if (amount >= 0n) {
				logger.debug(
					`Incrementing escrowed balance for chainID: ${escrowChainID}, tokenID: ${tokenID} by ${amount}`,
				);
				numRowsAffected = await tokenEscrowedTable.increment(
					{
						increment: { balance: amount },
						where: { escrowChainID, tokenID },
					},
					dbTrx,
				);
			}
			if (amount < 0n) {
				logger.debug(
					`Decrementing escrowed balance for chainID: ${escrowChainID}, tokenID: ${tokenID} by ${
						amount * -1n
					}`,
				);
				numRowsAffected = await tokenEscrowedTable.decrement(
					{
						decrement: { balance: amount * -1n },
						where: { escrowChainID, tokenID },
					},
					dbTrx,
				);
			}
			if (numRowsAffected === undefined) {
				logger.debug(
					`Creating new token escrowed balance entry for chainID: ${escrowChainID}, tokenID: ${tokenID} with balance: ${amount}`,
				);
				await tokenEscrowedTable.upsert(
					{
						escrowChainID,
						tokenID,
						balance: amount,
					},
					dbTrx,
				);
			}
		},
		{ concurrency: Math.min(escrowedUpdatesMap.size, COMMIT_MAX_CONCURRENCY) },
	);

	escrowedUpdatesMap.clear();
	logger.debug('Committed token escrowed balance updates successfully.');
};

module.exports = {
	recordTokenEscrowed,
	recordTokenUnescrowed,
	commitTokenEscrowedIndex,
};
