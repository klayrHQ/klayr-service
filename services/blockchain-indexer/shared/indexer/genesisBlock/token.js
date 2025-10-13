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
const { initSupportedTokens } = require('../../dataService/recorder/token/supported');

const config = require('../../../config');
const { addGenesisBlockJob } = require('./queue');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const logger = Logger();

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
			{ module: MODULE.TOKEN, subStore: MODULE_SUB_STORE.TOKEN.USER, limit: 10000 },
			totalUsers,
		);

		const tokenSupplyModuleData = await requestAll(
			requestConnector,
			'getGenesisAssetByModule',
			{ module: MODULE.TOKEN, subStore: MODULE_SUB_STORE.TOKEN.SUPPLY, limit: 10000 },
			totalSupplyItem,
		);

		const tokenEscrowedModuleData = await requestAll(
			requestConnector,
			'getGenesisAssetByModule',
			{ module: MODULE.TOKEN, subStore: MODULE_SUB_STORE.TOKEN.ESCROW, limit: 10000 },
			totalEscrowItem,
		);

		const tokenSupportedModuleData = await requestAll(
			requestConnector,
			'getGenesisAssetByModule',
			{ module: MODULE.TOKEN, subStore: MODULE_SUB_STORE.TOKEN.SUPPORTED, limit: 10000 },
			totalSupportedItem,
		);

		const userSubStoreInfos = tokenUserModuleData[MODULE_SUB_STORE.TOKEN.USER];
		const supplySubstoreInfos = tokenSupplyModuleData[MODULE_SUB_STORE.TOKEN.SUPPLY];
		const escrowSubstoreInfos = tokenEscrowedModuleData[MODULE_SUB_STORE.TOKEN.ESCROW];
		const supportedSubstoreInfos = tokenSupportedModuleData[MODULE_SUB_STORE.TOKEN.SUPPORTED];

		let numLockedEntries = 0;
		const lockedChangeMap = {};

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

		for (let i = 0; i < supplySubstoreInfos.length; i++) {
			const { tokenID, totalSupply } = supplySubstoreInfos[i];

			// Add entry to index the genesis token supply
			await addGenesisBlockJob('indexGenesisTokenSupply', {
				tokenID,
				totalSupply,
			});
		}

		for (let i = 0; i < escrowSubstoreInfos.length; i++) {
			const { escrowChainID, tokenID, amount } = escrowSubstoreInfos[i];

			// Add entry to index the genesis token escrowed
			await addGenesisBlockJob('indexGenesisTokenEscrowed', {
				escrowChainID,
				tokenID,
				amount,
			});
		}

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
			`Finished scheduling genesis account indexing jobs. Added: ${userSubStoreInfos.length} balance entries, ${numLockedEntries} locked entries, ${supplySubstoreInfos.length} supply entries, ${escrowSubstoreInfos.length} escrow entries, ${supportedSubstoreInfos.length} supported entries.`,
		);
	}

	logger.info('Finished indexing all the genesis assets from the Token module.');
};

module.exports = { indexTokenModuleAssets };
