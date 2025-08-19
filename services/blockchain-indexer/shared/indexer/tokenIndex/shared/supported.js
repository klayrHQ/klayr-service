const {
	DB: {
		MySQL: {
			getTableInstance,
			KVStore: { getKeyValueTable },
		},
	},
	Logger,
} = require('klayr-service-framework');

const BluebirdPromise = require('bluebird');

const config = require('../../../../config');
const tokenSupportedTableSchema = require('../../database/schema/tokenSupported');

const logger = Logger();
const keyValueTable = getKeyValueTable();

const MYSQL_ENDPOINT = config.endpoints.mysql;
const COMMIT_MAX_CONCURRENCY = 16;
const SUPPORT_ALL_TOKENS_KEY = '*:*';
const SUPPORT_ALL_TOKENS_TABLE_KEY = 'supportAllTokens';

const supportedTokensMap = new Map();

const getTokenSupportedTable = () => getTableInstance(tokenSupportedTableSchema, MYSQL_ENDPOINT);

const recordSupportAllTokens = isBlockDeletion => {
	const key = SUPPORT_ALL_TOKENS_KEY;
	logger.debug(`Recording supported all token: ${key}, isBlockDeletion: ${isBlockDeletion}`);
	supportedTokensMap.set(key, !isBlockDeletion);
};

const recordUnsupportAllTokens = isBlockDeletion => {
	const key = SUPPORT_ALL_TOKENS_KEY;
	logger.debug(`Recording unsupported all token: ${key}, isBlockDeletion: ${isBlockDeletion}`);
	supportedTokensMap.set(key, !!isBlockDeletion);
};

const recordSupportTokenID = (tokenID, isBlockDeletion) => {
	const key = `${tokenID}:null`;
	logger.debug(`Recording supported token: ${key}, isBlockDeletion: ${isBlockDeletion}`);
	supportedTokensMap.set(key, !isBlockDeletion);
};

const recordUnsupportTokenID = (tokenID, isBlockDeletion) => {
	const key = `${tokenID}:null`;
	logger.debug(`Recording removed token: ${key}, isBlockDeletion: ${isBlockDeletion}`);
	supportedTokensMap.set(key, !!isBlockDeletion);
};

const recordSupportAllTokenFromChainID = (chainID, isBlockDeletion) => {
	const key = `*:${chainID}`;
	logger.debug(`Recording supported token: ${key}, isBlockDeletion: ${isBlockDeletion}`);
	supportedTokensMap.set(key, !isBlockDeletion);
};

const recordUnsupportAllTokenFromChainID = (chainID, isBlockDeletion) => {
	const key = `*:${chainID}`;
	logger.debug(`Recording removed token: ${key}, isBlockDeletion: ${isBlockDeletion}`);
	supportedTokensMap.set(key, !!isBlockDeletion);
};

const commitSupportedTokens = async dbTrx => {
	if (supportedTokensMap.size === 0) {
		logger.trace('No supported token updates to commit.');
		return;
	}

	logger.debug(`Committing ${supportedTokensMap.size} supported token updates.`);
	const tokenSupportedTable = await getTokenSupportedTable();

	await BluebirdPromise.map(
		supportedTokensMap.entries(),
		async ([key, isSupported]) => {
			if (key === SUPPORT_ALL_TOKENS_KEY) {
				logger.trace(`Processing supported all token update, isSupported: ${isSupported}`);
				if (isSupported) {
					await keyValueTable.set(SUPPORT_ALL_TOKENS_TABLE_KEY, isSupported);
				} else {
					await keyValueTable.delete(SUPPORT_ALL_TOKENS_TABLE_KEY);
				}
				return;
			}

			const [tokenID, chainIDStr] = key.split(':');
			const chainID = chainIDStr === 'null' ? null : chainIDStr;

			logger.trace(
				`Processing supported token update for tokenID: ${tokenID}, chainID: ${chainID}, isSupported: ${isSupported}`,
			);

			if (isSupported) {
				await tokenSupportedTable.upsert({ tokenID, chainID }, dbTrx);
			} else {
				await tokenSupportedTable.delete({ tokenID, chainID }, dbTrx);
			}
		},
		{ concurrency: Math.min(supportedTokensMap.size, COMMIT_MAX_CONCURRENCY) },
	);

	supportedTokensMap.clear();
	logger.debug('Committed supported token updates successfully.');
};

const isTokenSupported = async (tokenID, chainID) => {
	logger.debug(`Checking if token is supported: tokenID=${tokenID}, chainID=${chainID}`);
	const tokenSupportedTable = await getTokenSupportedTable();

	// Case 1: Specific tokenID on a specific chainID (chainID is not null)
	if (chainID !== null) {
		const result = await tokenSupportedTable.find({ tokenID, chainID }, ['tokenID']);
		if (result.length > 0) {
			logger.debug(`Token ${tokenID} on chain ${chainID} is supported.`);
			return true;
		}
	}

	// Case 2: All tokens on a specific chainID are supported (tokenID is '*' and chainID is not null)
	if (chainID !== null) {
		const result = await tokenSupportedTable.find({ tokenID: '*', chainID }, ['tokenID']);
		if (result.length > 0) {
			logger.debug(`All tokens on chain ${chainID} are supported.`);
			return true;
		}
	}

	// Case 3: Specific tokenID is supported on the current chain (chainID is null)
	if (chainID === null) {
		const result = await tokenSupportedTable.find({ tokenID, chainID: null }, ['tokenID']);
		if (result.length > 0) {
			logger.debug(`Token ${tokenID} is globally supported (chainID is null).`);
			return true;
		}
	}

	logger.debug(`Token ${tokenID} on chain ${chainID} is NOT supported.`);
	return false;
};

module.exports = {
	recordSupportAllTokens,
	recordUnsupportAllTokens,
	recordSupportTokenID,
	recordUnsupportTokenID,
	recordSupportAllTokenFromChainID,
	recordUnsupportAllTokenFromChainID,
	commitSupportedTokens,
	isTokenSupported,
};
