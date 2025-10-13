const {
	DB: {
		MySQL: { getDBConnection, startDBTransaction, commitDBTransaction, rollbackDBTransaction },
	},
	Logger,
} = require('klayr-service-framework');

const {
	increaseTokenBalanceDB,
	increaseTokenTotalBalanceDB,
} = require('../../../dataService/recorder/token/balances');
const { increaseTokenLockedDB } = require('../../../dataService/recorder/token/locked');
const { increaseTokenSupplyDB } = require('../../../dataService/recorder/token/supply');
const { increaseTokenEscrowedDB } = require('../../../dataService/recorder/token/escrowed');
const { updateAccountInitializationDB } = require('../../../dataService/recorder/token/account');
const {
	updateSupportAllTokensDB,
	updateSupportAllTokenFromChainIDDB,
	updateSupportTokenIDDB,
} = require('../../../dataService/recorder/token/supported');

const config = require('../../../../config');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const logger = Logger();

let connection;

const getConnection = async () => {
	if (!connection) {
		connection = await getDBConnection(MYSQL_ENDPOINT);
	}
	return connection;
};

const indexGenesisTokenBalances = async payload => {
	const connection = await getConnection();

	// since there are two db write operation, we use transaction to safely rollback later
	const dbTrx = await startDBTransaction(connection);

	const { address, tokenID, availableBalance } = payload;
	try {
		await increaseTokenBalanceDB(address, tokenID, BigInt(availableBalance), dbTrx);
		await updateAccountInitializationDB(address, tokenID, dbTrx);
		await commitDBTransaction(dbTrx);
	} catch (err) {
		await rollbackDBTransaction(dbTrx);
		logger.warn(
			`Updating genesis token balance for ${address} failed. Will retry.\nError: ${err.message}`,
		);
		throw err;
	}
};

const indexGenesisTokenLocked = async payload => {
	const connection = await getConnection();

	// since there are two db write operation, we use transaction to safely rollback later
	const dbTrx = await startDBTransaction(connection);

	const { address, tokenID, module, amount } = payload;
	try {
		await increaseTokenLockedDB(address, tokenID, module, BigInt(amount), dbTrx);
		await increaseTokenTotalBalanceDB(address, tokenID, BigInt(amount), dbTrx);
		await commitDBTransaction(dbTrx);
	} catch (err) {
		await rollbackDBTransaction(dbTrx);
		logger.warn(
			`Updating genesis token locked for ${address} failed. Will retry.\nError: ${err.message}`,
		);
		throw err;
	}
};

const indexGenesisTokenSupply = async payload => {
	const { tokenID, totalSupply } = payload;
	try {
		await increaseTokenSupplyDB(tokenID, BigInt(totalSupply));
	} catch (err) {
		logger.warn(
			`Updating genesis token supply for ${tokenID} failed. Will retry.\nError: ${err.message}`,
		);
		throw err;
	}
};

const indexGenesisTokenEscrowed = async payload => {
	const { escrowChainID, tokenID, amount } = payload;
	try {
		await increaseTokenEscrowedDB(escrowChainID, tokenID, BigInt(amount));
	} catch (err) {
		logger.warn(
			`Updating genesis token escrowed for ${escrowChainID} failed. Will retry.\nError: ${err.message}`,
		);
		throw err;
	}
};

const indexGenesisTokenSupportAllTokens = async () => {
	try {
		await updateSupportAllTokensDB();
	} catch (err) {
		logger.warn(
			`Updating genesis token supported for all failed. Will retry.\nError: ${err.message}`,
		);
		throw err;
	}
};

const indexGenesisTokenSupported = async payload => {
	const connection = await getConnection();

	const { chainID, supportedTokenIDs } = payload;
	try {
		if (supportedTokenIDs.length === 0) {
			await updateSupportAllTokenFromChainIDDB(chainID);
		} else {
			// since there are several db write operation, we use transaction to safely rollback later
			const dbTrx = await startDBTransaction(connection);
			try {
				for (let i = 0; i < supportedTokenIDs.length; i++) {
					await updateSupportTokenIDDB(supportedTokenIDs[i], dbTrx);
				}
				await commitDBTransaction(dbTrx);
			} catch (err) {
				await rollbackDBTransaction(dbTrx);
				throw err;
			}
		}
	} catch (err) {
		logger.warn(
			`Updating genesis token supported for ${chainID} failed. Will retry.\nError: ${err.message}`,
		);
		throw err;
	}
};

module.exports = {
	indexGenesisTokenBalances,
	indexGenesisTokenLocked,
	indexGenesisTokenSupply,
	indexGenesisTokenEscrowed,
	indexGenesisTokenSupportAllTokens,
	indexGenesisTokenSupported,
};
