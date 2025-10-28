const BluebirdPromise = require('bluebird');

const {
	DB: {
		MySQL: { getTableInstance },
	},
	Logger,
} = require('klayr-service-framework');

const { requestConnector } = require('../../utils/request');
const { MODULE, MODULE_SUB_STORE, getGenesisHeight } = require('../../constants');
const { updateTotalStake, updateTotalSelfStake } = require('../transactionProcessor/pos/stake');
const { indexAccountPublicKey } = require('../accountIndex');

const config = require('../../../config');
const accountsTableSchema = require('../../database/schema/accounts');
const stakesTableSchema = require('../../database/schema/stakes');
const commissionsTableSchema = require('../../database/schema/commissions');

const { getKlayr32AddressFromPublicKey } = require('../../utils/account');
const { INVALID_ED25519_KEY } = require('../../constants');

const logger = Logger();

const MYSQL_ENDPOINT = config.endpoints.mysql;
const BATCH_SIZE = 2000;
const BATCH_RETRY_DELAY = 1000;

const getStakesTable = () => getTableInstance(stakesTableSchema, MYSQL_ENDPOINT);
const getAccountsTable = () => getTableInstance(accountsTableSchema, MYSQL_ENDPOINT);
const getCommissionsTable = () => getTableInstance(commissionsTableSchema, MYSQL_ENDPOINT);

const isGeneratorKeyValid = generatorKey => generatorKey !== INVALID_ED25519_KEY;

const indexPosValidatorsInfo = async (numValidators, dbTrx) => {
	logger.debug('Starting to index the validators information from the genesis PoS module assets.');
	if (numValidators > 0) {
		const accountsTable = await getAccountsTable();
		const commissionsTable = await getCommissionsTable();

		for (let offset = 0; offset < numValidators; ) {
			try {
				const posModuleData = await requestConnector('getGenesisAssetByModule', {
					module: MODULE.POS,
					subStore: MODULE_SUB_STORE.POS.VALIDATORS,
					limit: BATCH_SIZE,
					offset,
				});

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

				const percent =
					numValidators > 0
						? Math.min((((offset + BATCH_SIZE) / numValidators) * 100).toFixed(1), 100)
						: 0;
				logger.info(
					`Scheduled ${Math.min(
						offset + BATCH_SIZE,
						numValidators,
					)} of ${numValidators} genesis validators item (${percent}%)`,
				);

				offset += BATCH_SIZE;
			} catch (err) {
				await new Promise(resolve => setTimeout(resolve, BATCH_RETRY_DELAY));
				logger.warn(`Retrying indexPosValidatorsInfo batch starting at offset ${offset}...`);
			}
		}
	}
	logger.debug('Finished indexing the validators information from the genesis PoS module assets.');
};

const indexPosStakesInfo = async (numStakers, dbTrx) => {
	logger.debug('Starting to index the stakes information from the genesis PoS module assets.');
	let totalStake = BigInt(0);
	let totalSelfStake = BigInt(0);

	if (numStakers > 0) {
		let totalStakers = 0;
		const stakesTable = await getStakesTable();

		for (let offset = 0; offset < numStakers; ) {
			try {
				const posModuleData = await requestConnector('getGenesisAssetByModule', {
					module: MODULE.POS,
					subStore: MODULE_SUB_STORE.POS.STAKERS,
					limit: BATCH_SIZE,
					offset,
				});

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
				totalStakers += allStakes.length;

				await stakesTable.upsert(allStakes, dbTrx);

				const percent =
					numStakers > 0
						? Math.min((((offset + BATCH_SIZE) / numStakers) * 100).toFixed(1), 100)
						: 0;
				logger.info(
					`Scheduled ${Math.min(
						offset + BATCH_SIZE,
						numStakers,
					)} of ${numStakers} genesis stakers item (${percent}%)`,
				);

				offset += BATCH_SIZE;
			} catch (err) {
				await new Promise(resolve => setTimeout(resolve, BATCH_RETRY_DELAY));
				logger.warn(`Retrying indexPosStakesInfo batch starting at offset ${offset}...`);
			}
		}

		logger.info(`Updated ${totalStakers} stakes from the genesis block.`);
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

	if (Object.keys(genesisBlockAssetsLength).includes(MODULE.POS)) {
		const numValidators = genesisBlockAssetsLength[MODULE.POS][MODULE_SUB_STORE.POS.VALIDATORS];
		const numStakers = genesisBlockAssetsLength[MODULE.POS][MODULE_SUB_STORE.POS.STAKERS];

		await indexPosValidatorsInfo(numValidators, dbTrx);
		await indexPosStakesInfo(numStakers, dbTrx);
	}

	logger.info('Finished indexing all the genesis assets from the PoS module.');
};

module.exports = { indexPosModuleAssets };
