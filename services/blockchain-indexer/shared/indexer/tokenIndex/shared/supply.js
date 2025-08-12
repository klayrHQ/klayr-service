const {
	DB: {
		MySQL: { getTableInstance },
	},
	Logger,
} = require('klayr-service-framework');
const BluebirdPromise = require('bluebird');

const config = require('../../../../config');
const tokenSupplyTableSchema = require('../../../database/schema/tokenSupply');

const logger = Logger();

const MYSQL_ENDPOINT = config.endpoints.mysql;
const COMMIT_MAX_CONCURRENCY = 16;

const getTokenSupplyTable = () => getTableInstance(tokenSupplyTableSchema, MYSQL_ENDPOINT);

const supplyUpdatesMap = new Map();

const recordTokenSupplyIncrease = (tokenID, addedAmount, isBlockDeletion) => {
	logger.debug(
		`Recording token supply increase for tokenID: ${tokenID}, amount: ${addedAmount}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = tokenID;
	const currentSupply = supplyUpdatesMap.get(key) || 0n;
	const amountToAdd = BigInt(addedAmount);
	const newSupply = isBlockDeletion ? currentSupply - amountToAdd : currentSupply + amountToAdd;
	supplyUpdatesMap.set(key, newSupply);
};

const recordTokenSupplyDecrease = (tokenID, removedAmount, isBlockDeletion) => {
	logger.debug(
		`Recording token supply decrease for tokenID: ${tokenID}, amount: ${removedAmount}, isBlockDeletion: ${isBlockDeletion}`,
	);
	const key = tokenID;
	const currentSupply = supplyUpdatesMap.get(key) || 0n;
	const amountToRemove = BigInt(removedAmount);
	const newSupply = isBlockDeletion
		? currentSupply + amountToRemove
		: currentSupply - amountToRemove;
	supplyUpdatesMap.set(key, newSupply);
};

const commitTokenSupplyIndex = async dbTrx => {
	if (supplyUpdatesMap.size === 0) {
		logger.trace('No token supply updates to commit.');
		return;
	}

	logger.debug(`Committing ${supplyUpdatesMap.size} token supply updates.`);
	const tokenSuppliesTable = await getTokenSupplyTable();

	await BluebirdPromise.map(
		supplyUpdatesMap.entries(),
		async ([tokenID, amount]) => {
			logger.trace(`Processing supply update for tokenID: ${tokenID}, amount: ${amount}`);

			let numRowsAffected;
			if (amount >= 0n) {
				logger.debug(`Incrementing supply for tokenID: ${tokenID} by ${amount}`);
				numRowsAffected = await tokenSuppliesTable.increment(
					{
						increment: { amount },
						where: { tokenID },
					},
					dbTrx,
				);
			}
			if (amount < 0n) {
				logger.debug(`Decrementing supply for tokenID: ${tokenID} by ${amount * -1n}`);
				numRowsAffected = await tokenSuppliesTable.decrement(
					{
						decrement: { amount: amount * -1n },
						where: { tokenID },
					},
					dbTrx,
				);
			}
			if (numRowsAffected === undefined) {
				logger.debug(
					`Creating new token supply entry for tokenID: ${tokenID} with supply: ${amount}`,
				);
				await tokenSuppliesTable.upsert(
					{
						tokenID,
						amount,
					},
					dbTrx,
				);
			}
		},
		{ concurrency: Math.min(supplyUpdatesMap.size, COMMIT_MAX_CONCURRENCY) },
	);

	supplyUpdatesMap.clear();
	logger.debug('Committed token supply updates successfully.');
};

module.exports = { recordTokenSupplyIncrease, recordTokenSupplyDecrease, commitTokenSupplyIndex };
