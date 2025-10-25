const {
	DB: {
		MySQL: { getDBConnection, startDBTransaction, commitDBTransaction, rollbackDBTransaction },
	},
	Logger,
} = require('klayr-service-framework');

const { requestConnector } = require('../../utils/request');
const { MODULE, MODULE_SUB_STORE } = require('../../constants');
const { updateTotalLockedAmounts } = require('../utils/blockchainIndex');
const { initSupportedTokens } = require('../../dataService/recorder/token/supported');

const config = require('../../../config');
const { addGenesisBlockJob } = require('./queue');

const MYSQL_ENDPOINT = config.endpoints.mysql;
const BATCH_SIZE = 2000;
const BATCH_RETRY_DELAY = 1000;

const logger = Logger();

const indexTokenModuleAssets = async dbTrx => {
	logger.info('Starting to index the genesis assets from the Token module.');
	const genesisBlockAssetsLength = await requestConnector('getGenesisAssetsLength', {
		module: MODULE.TOKEN,
	});

	if (Object.keys(genesisBlockAssetsLength).includes(MODULE.TOKEN)) {
		let numBalanceEntries = 0;
		let numLockedEntries = 0;
		let numSupplyEntries = 0;
		let numEscrowedEntries = 0;
		let numSupportedEntries = 0;

		const lockedChangeMap = {};

		const totalUsers = genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.USER];
		const totalSupplyItem = genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.SUPPLY];
		const totalEscrowItem = genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.ESCROW];
		const totalSupportedItem =
			genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.SUPPORTED];

		for (let offset = 0; offset < totalUsers; ) {
			try {
				const tokenUserModuleData = await requestConnector('getGenesisAssetByModule', {
					module: MODULE.TOKEN,
					subStore: MODULE_SUB_STORE.TOKEN.USER,
					limit: BATCH_SIZE,
					offset,
				});

				const userSubStoreInfos = tokenUserModuleData[MODULE_SUB_STORE.TOKEN.USER];

				// eslint-disable-next-line no-restricted-syntax
				for (let i = 0; i < userSubStoreInfos.length; i++) {
					const { address, tokenID, availableBalance, lockedBalances } = userSubStoreInfos[i];

					// Add entry to index the genesis token balances
					await addGenesisBlockJob('indexGenesisTokenBalances', {
						address,
						tokenID,
						availableBalance,
					});

					// eslint-disable-next-line no-restricted-syntax
					for (let k = 0; k < lockedBalances.length; k++) {
						const lockedBalance = lockedBalances[k];
						if (!lockedChangeMap[tokenID]) lockedChangeMap[tokenID] = BigInt(0);
						lockedChangeMap[tokenID] += BigInt(lockedBalance.amount);

						// Add entry to index the genesis token locked
						await addGenesisBlockJob('indexGenesisTokenLocked', {
							address,
							tokenID,
							module: lockedBalance.module,
							amount: lockedBalance.amount,
						});
					}

					numLockedEntries += lockedBalances.length;
				}
				numBalanceEntries += userSubStoreInfos.length;

				const percent =
					totalUsers > 0
						? Math.min((((offset + BATCH_SIZE) / totalUsers) * 100).toFixed(1), 100)
						: 0;
				logger.info(
					`Scheduled ${Math.min(
						offset + BATCH_SIZE,
						totalUsers,
					)} of ${totalUsers} user item (${percent}%)`,
				);

				offset += BATCH_SIZE;
			} catch (err) {
				await new Promise(resolve => setTimeout(resolve, BATCH_RETRY_DELAY));
				logger.warn(
					`Retrying indexGenesisTokenBalances & indexGenesisTokenLocked batch starting at offset ${offset}...`,
				);
			}
		}

		for (let offset = 0; offset < totalSupplyItem; ) {
			try {
				const tokenSupplyModuleData = await requestConnector('getGenesisAssetByModule', {
					module: MODULE.TOKEN,
					subStore: MODULE_SUB_STORE.TOKEN.SUPPLY,
					limit: BATCH_SIZE,
					offset,
				});

				const supplySubstoreInfos = tokenSupplyModuleData[MODULE_SUB_STORE.TOKEN.SUPPLY];

				for (let i = 0; i < supplySubstoreInfos.length; i++) {
					const { tokenID, totalSupply } = supplySubstoreInfos[i];

					// Add entry to index the genesis token supply
					await addGenesisBlockJob('indexGenesisTokenSupply', {
						tokenID,
						totalSupply,
					});
				}

				numSupplyEntries += supplySubstoreInfos.length;

				const percent =
					totalSupplyItem > 0
						? Math.min((((offset + BATCH_SIZE) / totalSupplyItem) * 100).toFixed(1), 100)
						: 0;
				logger.info(
					`Scheduled ${Math.min(
						offset + BATCH_SIZE,
						totalSupplyItem,
					)} of ${totalSupplyItem} supply item (${percent}%)`,
				);

				offset += BATCH_SIZE;
			} catch (err) {
				await new Promise(resolve => setTimeout(resolve, BATCH_RETRY_DELAY));
				logger.warn(`Retrying indexGenesisTokenSupply batch starting at offset ${offset}...`);
			}
		}

		for (let offset = 0; offset < totalEscrowItem; ) {
			try {
				const tokenEscrowedModuleData = await requestConnector('getGenesisAssetByModule', {
					module: MODULE.TOKEN,
					subStore: MODULE_SUB_STORE.TOKEN.ESCROW,
					limit: BATCH_SIZE,
					offset,
				});

				const escrowSubstoreInfos = tokenEscrowedModuleData[MODULE_SUB_STORE.TOKEN.ESCROW];

				for (let i = 0; i < escrowSubstoreInfos.length; i++) {
					const { escrowChainID, tokenID, amount } = escrowSubstoreInfos[i];

					// Add entry to index the genesis token escrowed
					await addGenesisBlockJob('indexGenesisTokenEscrowed', {
						escrowChainID,
						tokenID,
						amount,
					});
				}

				numEscrowedEntries += escrowSubstoreInfos.length;

				const percent =
					totalEscrowItem > 0
						? Math.min((((offset + BATCH_SIZE) / totalEscrowItem) * 100).toFixed(1), 100)
						: 0;
				logger.info(
					`Scheduled ${Math.min(
						offset + BATCH_SIZE,
						totalEscrowItem,
					)} of ${totalEscrowItem} escrow item (${percent}%)`,
				);

				offset += BATCH_SIZE;
			} catch (err) {
				await new Promise(resolve => setTimeout(resolve, BATCH_RETRY_DELAY));
				logger.warn(`Retrying indexGenesisTokenEscrowed batch starting at offset ${offset}...`);
			}
		}

		for (let offset = 0; offset < totalSupportedItem; ) {
			try {
				const tokenSupportedModuleData = await requestConnector('getGenesisAssetByModule', {
					module: MODULE.TOKEN,
					subStore: MODULE_SUB_STORE.TOKEN.SUPPORTED,
					limit: BATCH_SIZE,
					offset,
				});

				const supportedSubstoreInfos = tokenSupportedModuleData[MODULE_SUB_STORE.TOKEN.SUPPORTED];

				if (supportedSubstoreInfos.length === 1 && supportedSubstoreInfos[0].chainID === '') {
					const { chainID, supportedTokenIDs } = supportedSubstoreInfos[0];

					await addGenesisBlockJob('indexGenesisTokenSupportAllTokens', {
						chainID,
						supportedTokenIDs,
					});
				} else {
					for (let i = 0; i < supportedSubstoreInfos.length; i++) {
						const { chainID, supportedTokenIDs } = supportedSubstoreInfos[i];

						// Add entry to index the genesis token supported
						await addGenesisBlockJob('indexGenesisTokenSupported', {
							chainID,
							supportedTokenIDs,
						});
					}
				}

				numSupportedEntries += supportedSubstoreInfos.length;

				const percent =
					totalSupportedItem > 0
						? Math.min((((offset + BATCH_SIZE) / totalSupportedItem) * 100).toFixed(1), 100)
						: 0;
				logger.info(
					`Scheduled ${Math.min(
						offset + BATCH_SIZE,
						totalSupportedItem,
					)} of ${totalSupportedItem} supported token item (${percent}%)`,
				);

				offset += BATCH_SIZE;
			} catch (err) {
				await new Promise(resolve => setTimeout(resolve, BATCH_RETRY_DELAY));
				logger.warn(
					`Retrying indexGenesisTokenSupportAllTokens & indexGenesisTokenSupported batch starting at offset ${offset}...`,
				);
			}
		}

		await updateTotalLockedAmounts(lockedChangeMap, dbTrx);

		const connection = await getDBConnection(MYSQL_ENDPOINT);

		while (true) {
			const localDBTrx = await startDBTransaction(connection);
			try {
				await initSupportedTokens(localDBTrx);
				await commitDBTransaction(localDBTrx);
				break;
			} catch (err) {
				await rollbackDBTransaction(localDBTrx);
				logger.warn(
					`Updating genesis token supported for native chain failed. Will retry.\nError: ${err.message}`,
				);
			}
		}

		logger.info(
			`Finished scheduling genesis account indexing jobs. Added: ${numBalanceEntries} balance entries, ${numLockedEntries} locked entries, ${numSupplyEntries} supply entries, ${numEscrowedEntries} escrow entries, ${numSupportedEntries} supported entries.`,
		);
	}

	logger.info('Finished indexing all the genesis assets from the Token module.');
};

module.exports = { indexTokenModuleAssets };
