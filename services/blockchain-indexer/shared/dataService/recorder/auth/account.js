const {
	DB: {
		MySQL: { getTableInstance },
	},
	Logger,
} = require('klayr-service-framework');
const BluebirdPromise = require('bluebird');

const config = require('../../../../config');
const authTableSchema = require('../../../database/schema/auth'); // Path to auth.js schema

const logger = Logger();

const MYSQL_ENDPOINT = config.endpoints.mysql;
const COMMIT_MAX_CONCURRENCY = 16;

const getAuthTable = () => getTableInstance(authTableSchema, MYSQL_ENDPOINT);

// The key is 'address' and the value is the auth account object (for upsert) or false (for delete)
const authUpdatesMap = new Map();

const getAuthAccount = async address => {
	const authTable = await getAuthTable();
	const data = await authTable.find({ address, limit: 1 }, [
		'nonce',
		'numberOfSignatures',
		'mandatoryKeys',
		'optionalKeys',
	]);
	if (data.length) {
		const account = data[0];
		if (account.mandatoryKeys) {
			account.mandatoryKeys = JSON.parse(account.mandatoryKeys);
		}
		if (account.optionalKeys) {
			account.optionalKeys = JSON.parse(account.optionalKeys);
		}
		return account;
	}
	return undefined;
};

const updateAuthAccountDB = (authAccountData, dbTrx) => {
	const authTable = getAuthTable();
	return authTable.upsert(authAccountData, dbTrx);
};

const recordAuthAccount = (address, account, isBlockDeletion) => {
	logger.debug(
		`Recording auth account for address: ${address}, isBlockDeletion: ${isBlockDeletion}`,
	);
	if (isBlockDeletion) {
		// If block deletion, it means we are reverting a previous record.
		// If it was an addition, now it's a deletion. If it was a deletion, now it's an addition.
		// For simplicity, let's assume recordAuthAccount is primarily for adding/updating.
		// If isBlockDeletion is true, it means this account should NOT be in the final state.
		authUpdatesMap.set(address, false); // Mark for deletion
	} else {
		// If not block deletion, this account should be in the final state.
		authUpdatesMap.set(address, account); // Mark for upsert
	}
};

const commitAuthAccount = async dbTrx => {
	if (authUpdatesMap.size === 0) {
		logger.trace('No auth account updates to commit.');
		return;
	}

	logger.debug(`Committing ${authUpdatesMap.size} auth account updates.`);
	const authTable = await getAuthTable();

	await BluebirdPromise.map(
		authUpdatesMap.entries(),
		async ([address, accountData]) => {
			logger.trace(`Processing auth account update for address: ${address}`);
			if (accountData) {
				// If accountData is an object, it's an upsert
				await authTable.upsert(accountData, dbTrx);
			} else {
				// If accountData is false, it's a deletion
				await authTable.delete({ address }, dbTrx);
			}
		},
		{ concurrency: Math.min(authUpdatesMap.size, COMMIT_MAX_CONCURRENCY) },
	);

	authUpdatesMap.clear();
	logger.debug('Committed auth account updates successfully.');
};

module.exports = {
	recordAuthAccount,
	getAuthAccount,
	commitAuthAccount,
	updateAuthAccountDB,
};
