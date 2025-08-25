const {
	DB: {
		MySQL: { getDBConnection, startDBTransaction, commitDBTransaction, rollbackDBTransaction },
	},
	Logger,
} = require('klayr-service-framework');

const { requestConnector } = require('../../utils/request');
const { MODULE, MODULE_SUB_STORE } = require('../../constants');
const requestAll = require('../../utils/requestAll');
const { updateTotalLockedAmounts } = require('../utils/blockchainIndex');
const {
	increaseTokenBalanceDB,
	increaseTokenTotalBalanceDB,
} = require('../../dataService/recorder/token/balances');
const { increaseTokenLockedDB } = require('../../dataService/recorder/token/locked');
const { increaseTokenSupplyDB } = require('../../dataService/recorder/token/supply');
const { increaseTokenEscrowedDB } = require('../../dataService/recorder/token/escrowed');
const { updateAccountInitializationDB } = require('../../dataService/recorder/token/account');
const {
	updateSupportAllTokensDB,
	updateSupportAllTokenFromChainIDDB,
	updateSupportTokenIDDB,
	initSupportedTokens,
} = require('../../dataService/recorder/token/supported');

const config = require('../../../config');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const logger = Logger();

const genesisTokenBalances = [];
const genesisTokenLocked = [];
const genesisTokenSupply = [];
const genesisTokenEscrowed = [];
const genesisTokenSupported = [];

const indexTokenModuleAssets = async dbTrx => {
	logger.info('Starting to index the genesis assets from the Token module.');
	const genesisBlockAssetsLength = await requestConnector('getGenesisAssetsLength', {
		module: MODULE.TOKEN,
	});

	if (Object.keys(genesisBlockAssetsLength).includes(MODULE.TOKEN)) {
		const totalUsers = genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.USER];
		const totalSupplyItem = genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.SUPPLY];
		const totalEscrowItem = genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.ESCROW];
		const totalSupportedItem =
			genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.SUPPORTED];

		const tokenUserModuleData = await requestAll(
			requestConnector,
			'getGenesisAssetByModule',
			{ module: MODULE.TOKEN, subStore: MODULE_SUB_STORE.TOKEN.USER, limit: 1000 },
			totalUsers,
		);

		const tokenSupplyModuleData = await requestAll(
			requestConnector,
			'getGenesisAssetByModule',
			{ module: MODULE.TOKEN, subStore: MODULE_SUB_STORE.TOKEN.SUPPLY, limit: 1000 },
			totalSupplyItem,
		);

		const tokenEscrowedModuleData = await requestAll(
			requestConnector,
			'getGenesisAssetByModule',
			{ module: MODULE.TOKEN, subStore: MODULE_SUB_STORE.TOKEN.ESCROW, limit: 1000 },
			totalEscrowItem,
		);

		const tokenSupportedModuleData = await requestAll(
			requestConnector,
			'getGenesisAssetByModule',
			{ module: MODULE.TOKEN, subStore: MODULE_SUB_STORE.TOKEN.SUPPORTED, limit: 1000 },
			totalSupportedItem,
		);

		const userSubStoreInfos = tokenUserModuleData[MODULE_SUB_STORE.TOKEN.USER];
		const supplySubstoreInfos = tokenSupplyModuleData[MODULE_SUB_STORE.TOKEN.SUPPLY];
		const escrowSubstoreInfos = tokenEscrowedModuleData[MODULE_SUB_STORE.TOKEN.ESCROW];
		const supportedSubstoreInfos = tokenSupportedModuleData[MODULE_SUB_STORE.TOKEN.SUPPORTED];

		const lockedChangeMap = {};

		// eslint-disable-next-line no-restricted-syntax
		for (let i = 0; i < userSubStoreInfos.length; i++) {
			const { address, tokenID, availableBalance, lockedBalances } = userSubStoreInfos[i];

			// Add entry to index the genesis token balances
			genesisTokenBalances.push({
				address,
				tokenID,
				availableBalance: BigInt(availableBalance),
			});

			// eslint-disable-next-line no-restricted-syntax
			for (let k = 0; k < lockedBalances.length; k++) {
				const lockedBalance = lockedBalances[k];
				if (!lockedChangeMap[tokenID]) lockedChangeMap[tokenID] = BigInt(0);
				lockedChangeMap[tokenID] += BigInt(lockedBalance.amount);

				// Add entry to index the genesis token locked
				genesisTokenLocked.push({
					address,
					tokenID,
					module: lockedBalance.module,
					amount: BigInt(lockedBalance.amount),
				});
			}
		}

		for (let i = 0; i < supplySubstoreInfos.length; i++) {
			const { tokenID, totalSupply } = supplySubstoreInfos[i];

			// Add entry to index the genesis token supply
			genesisTokenSupply.push({
				tokenID,
				totalSupply: BigInt(totalSupply),
			});
		}

		for (let i = 0; i < escrowSubstoreInfos.length; i++) {
			const { escrowChainID, tokenID, amount } = escrowSubstoreInfos[i];

			// Add entry to index the genesis token escrowed
			genesisTokenEscrowed.push({
				escrowChainID,
				tokenID,
				amount: BigInt(amount),
			});
		}

		for (let i = 0; i < supportedSubstoreInfos.length; i++) {
			const { chainID, supportedTokenIDs } = supportedSubstoreInfos[i];

			// Add entry to index the genesis token supported
			genesisTokenSupported.push({
				chainID,
				supportedTokenIDs,
			});
		}

		await updateTotalLockedAmounts(lockedChangeMap, dbTrx);
	}

	startGenesisTokenIndexing();

	logger.info('Finished indexing all the genesis assets from the Token module.');
};

let indexedgenesisTokenBalances;
let interval;

const processGenesisTokenIndexing = async () => {
	try {
		if (
			[
				genesisTokenBalances.length,
				genesisTokenLocked.length,
				genesisTokenSupply.length,
				genesisTokenEscrowed.length,
				genesisTokenSupported.length,
			].some(item => item > 0)
		) {
			if (indexedgenesisTokenBalances === false) return;
		} else {
			if (indexedgenesisTokenBalances === true) clearInterval(interval);
			return;
		}
		indexedgenesisTokenBalances = false;

		logger.info('Started indexing genesis account balances.');
		const connection = await getDBConnection(MYSQL_ENDPOINT);

		let numBalanceEntries = 0;
		while (genesisTokenBalances.length) {
			// since there are two db write operation, we use transaction to safely rollback later
			const dbTrx = await startDBTransaction(connection);

			const { address, tokenID, availableBalance } = genesisTokenBalances.shift();
			try {
				await increaseTokenBalanceDB(address, tokenID, availableBalance, dbTrx);
				await updateAccountInitializationDB(address, tokenID, dbTrx);
				await commitDBTransaction(dbTrx);
				numBalanceEntries++;
			} catch (err) {
				await rollbackDBTransaction(dbTrx);
				genesisTokenBalances.push({ address, tokenID, availableBalance });
				logger.warn(
					`Updating genesis token balance for ${address} failed. Will retry.\nError: ${err.message}`,
				);
			}
		}

		let numLockedEntries = 0;
		while (genesisTokenLocked.length) {
			// since there are two db write operation, we use transaction to safely rollback later
			const dbTrx = await startDBTransaction(connection);

			const { address, tokenID, module, amount } = genesisTokenLocked.shift();
			try {
				await increaseTokenLockedDB(address, tokenID, module, amount, dbTrx);
				await increaseTokenTotalBalanceDB(address, tokenID, amount, dbTrx);
				await commitDBTransaction(dbTrx);
				numLockedEntries++;
			} catch (err) {
				await rollbackDBTransaction(dbTrx);
				genesisTokenLocked.push({ address, tokenID, module, amount });
				logger.warn(
					`Updating genesis token locked for ${address} failed. Will retry.\nError: ${err.message}`,
				);
			}
		}

		let numSupplyEntries = 0;
		while (genesisTokenSupply.length) {
			const { tokenID, totalSupply } = genesisTokenSupply.shift();
			try {
				await increaseTokenSupplyDB(tokenID, totalSupply);
				numSupplyEntries++;
			} catch (err) {
				genesisTokenSupply.push({ tokenID, totalSupply });
				logger.warn(
					`Updating genesis token supply for ${tokenID} failed. Will retry.\nError: ${err.message}`,
				);
			}
		}

		let numEscrowEntries = 0;
		while (genesisTokenEscrowed.length) {
			const { escrowChainID, tokenID, amount } = genesisTokenEscrowed.shift();
			try {
				await increaseTokenEscrowedDB(escrowChainID, tokenID, amount);
				numEscrowEntries++;
			} catch (err) {
				genesisTokenEscrowed.push({ escrowChainID, tokenID, amount });
				logger.warn(
					`Updating genesis token escrowed for ${escrowChainID} failed. Will retry.\nError: ${err.message}`,
				);
			}
		}

		let numSupportedEntries = 0;

		// if only one entry, and chainID is empty buffer, it means support all tokens
		if (genesisTokenSupported.length === 1 && genesisTokenSupported[0].chainID === '') {
			while (true) {
				try {
					await updateSupportAllTokensDB();
					numSupportedEntries++;
					break;
				} catch (err) {
					logger.warn(
						`Updating genesis token supported for all failed. Will retry.\nError: ${err.message}`,
					);
				}
			}
		} else {
			while (genesisTokenSupported.length) {
				const { chainID, supportedTokenIDs } = genesisTokenSupported.shift();
				try {
					if (supportedTokenIDs.length === 0) {
						await updateSupportAllTokenFromChainIDDB(chainID);
						numSupportedEntries++;
					} else {
						// since there are several db write operation, we use transaction to safely rollback later
						const dbTrx = await startDBTransaction(connection);
						try {
							for (let i = 0; i < supportedTokenIDs.length; i++) {
								await updateSupportTokenIDDB(supportedTokenIDs[i], dbTrx);
							}
							await commitDBTransaction(dbTrx);
							numSupportedEntries += supportedTokenIDs.length;
						} catch (err) {
							await rollbackDBTransaction(dbTrx);
							throw err;
						}
					}
				} catch (err) {
					genesisTokenSupported.push({ chainID, supportedTokenIDs });
					logger.warn(
						`Updating genesis token supported for ${chainID} failed. Will retry.\nError: ${err.message}`,
					);
				}
			}
		}

		// and then we add native chain and token to the supported token list
		while (true) {
			const dbTrx = await startDBTransaction(connection);
			try {
				await initSupportedTokens(dbTrx);
				await commitDBTransaction(dbTrx);
				numSupportedEntries++;
				break;
			} catch (err) {
				await rollbackDBTransaction(dbTrx);
				logger.warn(
					`Updating genesis token supported for native chain failed. Will retry.\nError: ${err.message}`,
				);
			}
		}

		indexedgenesisTokenBalances = true;
		logger.info(
			`Finished indexing genesis account balances. Added: ${numBalanceEntries} balance entries, ${numLockedEntries} locked entries, ${numSupplyEntries} supply entries, ${numEscrowEntries} escrow entries, ${numSupportedEntries} supported entries.`,
		);
	} catch (_) {
		// No actions required
	}
};

const startGenesisTokenIndexing = () => {
	setTimeout(processGenesisTokenIndexing, 0);
	interval = setInterval(processGenesisTokenIndexing, 5 * 60 * 1000);
};

module.exports = { indexTokenModuleAssets };
