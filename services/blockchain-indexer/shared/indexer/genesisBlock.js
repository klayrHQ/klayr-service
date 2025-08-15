/*
 * Klayrhq/klayrservice
 * Copyright © 2023 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
const BluebirdPromise = require('bluebird');

const {
	DB: {
		MySQL: {
			getTableInstance,
			getDBConnection,
			startDBTransaction,
			commitDBTransaction,
			rollbackDBTransaction,
		},
	},
	Logger,
} = require('klayr-service-framework');

const { MODULE, MODULE_SUB_STORE, getGenesisHeight } = require('../constants');
const { updateTotalStake, updateTotalSelfStake } = require('./transactionProcessor/pos/stake');
const { indexAccountPublicKey, triggerAccountUpdates } = require('./accountIndex');
const { updateTotalLockedAmounts } = require('./utils/blockchainIndex');

const requestAll = require('../utils/requestAll');
const config = require('../../config');
const accountsTableSchema = require('../database/schema/accounts');
const stakesTableSchema = require('../database/schema/stakes');
const commissionsTableSchema = require('../database/schema/commissions');

const { getKlayr32AddressFromPublicKey } = require('../utils/account');
const { requestConnector } = require('../utils/request');
const { INVALID_ED25519_KEY } = require('../constants');
const {
	increaseTokenBalanceDB,
	increaseTokenTotalBalanceDB,
} = require('./tokenIndex/shared/balances');
const { increaseTokenLockedDB } = require('./tokenIndex/shared/locked');
const { increaseTokenSupplyDB } = require('./tokenIndex/shared/supply');
const { increaseTokenEscrowedDB } = require('./tokenIndex/shared/escrowed');
const { updateAccountInitializationDB } = require('./tokenIndex/shared/account');

const logger = Logger();

const MYSQL_ENDPOINT = config.endpoints.mysql;

const getStakesTable = () => getTableInstance(stakesTableSchema, MYSQL_ENDPOINT);
const getAccountsTable = () => getTableInstance(accountsTableSchema, MYSQL_ENDPOINT);
const getCommissionsTable = () => getTableInstance(commissionsTableSchema, MYSQL_ENDPOINT);

let intervalTimeout;
const genesisTokenBalances = [];
const genesisTokenLocked = [];
const genesisTokenSupply = [];
const genesisTokenEscrowed = [];

const getGenesisAssetIntervalTimeout = () => intervalTimeout;

const indexTokenModuleAssets = async dbTrx => {
	logger.info('Starting to index the genesis assets from the Token module.');
	const genesisBlockAssetsLength = await requestConnector('getGenesisAssetsLength', {
		module: MODULE.TOKEN,
	});

	const totalUsers = genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.USER];
	const totalSupplyItem = genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.SUPPLY];
	const totalEscrowItem = genesisBlockAssetsLength[MODULE.TOKEN][MODULE_SUB_STORE.TOKEN.ESCROW];

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

	const userSubStoreInfos = tokenUserModuleData[MODULE_SUB_STORE.TOKEN.USER];
	const supplySubstoreInfos = tokenSupplyModuleData[MODULE_SUB_STORE.TOKEN.SUPPLY];
	const escrowSubstoreInfos = tokenEscrowedModuleData[MODULE_SUB_STORE.TOKEN.ESCROW];

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

	await updateTotalLockedAmounts(lockedChangeMap, dbTrx);
	logger.info('Finished indexing all the genesis assets from the Token module.');
};

const isGeneratorKeyValid = generatorKey => generatorKey !== INVALID_ED25519_KEY;

const indexPosValidatorsInfo = async (numValidators, dbTrx) => {
	logger.debug('Starting to index the validators information from the genesis PoS module assets.');
	if (numValidators > 0) {
		const accountsTable = await getAccountsTable();
		const commissionsTable = await getCommissionsTable();

		const posModuleData = await requestAll(
			requestConnector,
			'getGenesisAssetByModule',
			{ module: MODULE.POS, subStore: MODULE_SUB_STORE.POS.VALIDATORS, limit: 1000 },
			numValidators,
		);

		const validators = posModuleData[MODULE_SUB_STORE.POS.VALIDATORS];
		const genesisHeight = await getGenesisHeight();

		const commissionEntries = await BluebirdPromise.map(
			validators,
			async validator => {
				// Index all valid public keys
				if (isGeneratorKeyValid(validator.generatorKey)) {
					const account = {
						address: getKlayr32AddressFromPublicKey(validator.generatorKey),
						publicKey: validator.generatorKey,
					};

					await accountsTable
						.upsert(account)
						.catch(() => indexAccountPublicKey(validator.generatorKey));
				}

				return {
					address: validator.address,
					commission: validator.commission,
					height: genesisHeight,
				};
			},
			{ concurrency: validators.length },
		);

		await commissionsTable.upsert(commissionEntries, dbTrx);
	}
	logger.debug('Finished indexing the validators information from the genesis PoS module assets.');
};

const indexPosStakesInfo = async (numStakers, dbTrx) => {
	logger.debug('Starting to index the stakes information from the genesis PoS module assets.');
	let totalStake = BigInt(0);
	let totalSelfStake = BigInt(0);

	if (numStakers > 0) {
		const stakesTable = await getStakesTable();

		const posModuleData = await requestAll(
			requestConnector,
			'getGenesisAssetByModule',
			{ module: MODULE.POS, subStore: MODULE_SUB_STORE.POS.STAKERS, limit: 1000 },
			numStakers,
		);
		const stakers = posModuleData[MODULE_SUB_STORE.POS.STAKERS];

		const allStakes = [];
		for (let i = 0; i < stakers.length; i++) {
			const stakerAddress = stakers[i].address;
			const stakes = stakers[i].stakes;
			for (let j = 0; j < stakes.length; j++) {
				const validatorAddress = stakes[j].validatorAddress;
				const amount = stakes[j].amount;

				allStakes.push({
					stakerAddress,
					validatorAddress,
					amount: BigInt(amount),
				});

				totalStake += BigInt(amount);
				if (stakerAddress === validatorAddress) {
					totalSelfStake += BigInt(amount);
				}
			}
		}

		await stakesTable.upsert(allStakes, dbTrx);
		logger.info(`Updated ${allStakes.length} stakes from the genesis block.`);
	}

	await updateTotalStake(totalStake, dbTrx);
	logger.info(`Updated total stakes at genesis: ${totalStake.toString()}.`);

	await updateTotalSelfStake(totalSelfStake, dbTrx);
	logger.info(`Updated total self-stakes information at genesis: ${totalSelfStake.toString()}.`);
	logger.debug('Finished indexing the stakes information from the genesis PoS module assets.');
};

const indexPosModuleAssets = async dbTrx => {
	logger.info('Starting to index the genesis assets from the PoS module.');
	const genesisBlockAssetsLength = await requestConnector('getGenesisAssetsLength', {
		module: MODULE.POS,
	});
	const numValidators = genesisBlockAssetsLength[MODULE.POS][MODULE_SUB_STORE.POS.VALIDATORS];
	const numStakers = genesisBlockAssetsLength[MODULE.POS][MODULE_SUB_STORE.POS.STAKERS];

	await indexPosValidatorsInfo(numValidators, dbTrx);
	await indexPosStakesInfo(numStakers, dbTrx);
	logger.info('Finished indexing all the genesis assets from the PoS module.');
};

const indexGenesisBlockAssets = async dbTrx => {
	clearTimeout(intervalTimeout);
	logger.info('Starting to index the genesis assets.');
	intervalTimeout = setInterval(
		() => logger.info('Genesis assets indexing still in progress...'),
		5000,
	);
	await indexTokenModuleAssets(dbTrx);
	await indexPosModuleAssets(dbTrx);

	await triggerAccountUpdates();
	clearInterval(intervalTimeout);
	logger.info('Finished indexing all the genesis assets.');
};

let indexedgenesisTokenBalances;
const interval = setInterval(async () => {
	try {
		if (
			[
				genesisTokenBalances.length,
				genesisTokenLocked.length,
				genesisTokenSupply.length,
				genesisTokenEscrowed.length,
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
				numBalanceEntries--;
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
				numLockedEntries--;
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
				numSupplyEntries--;
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
				numEscrowEntries--;
				logger.warn(
					`Updating genesis token escrowed for ${escrowChainID} failed. Will retry.\nError: ${err.message}`,
				);
			}
		}

		indexedgenesisTokenBalances = true;
		logger.info(
			`Finished indexing genesis account balances. Added: ${numBalanceEntries} balance entries, ${numLockedEntries} locked entries, ${numSupplyEntries} supply entries, ${numEscrowEntries} escrow entries.`,
		);
	} catch (_) {
		// No actions required
	}
}, 5 * 60 * 1000);

module.exports = {
	getGenesisAssetIntervalTimeout,
	indexGenesisBlockAssets,

	// For testing
	indexTokenModuleAssets,
	indexPosModuleAssets,
};
