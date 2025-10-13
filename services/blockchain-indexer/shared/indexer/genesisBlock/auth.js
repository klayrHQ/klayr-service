const { Logger } = require('klayr-service-framework');
const { MODULE, MODULE_SUB_STORE } = require('../../constants');

const { requestConnector } = require('../../utils/request');
const { getKlayr32AddressFromHexAddress } = require('../../utils/account');
const { addGenesisBlockJob } = require('./queue');

const logger = Logger();
const BATCH_SIZE = 2000;
const BATCH_RETRY_DELAY = 1000;

const indexAuthModuleAssets = async dbTrx => {
	logger.info('Starting to index the genesis assets from the auth module.');

	const genesisBlockAssetsLength = await requestConnector('getGenesisAssetsLength', {
		module: MODULE.AUTH,
	});

	if (Object.keys(genesisBlockAssetsLength).includes(MODULE.AUTH)) {
		const totalAuthData = genesisBlockAssetsLength[MODULE.AUTH][MODULE_SUB_STORE.AUTH.DATA];

		for (let offset = 0; offset < totalAuthData; ) {
			try {
				const authModuleData = await requestConnector('getGenesisAssetByModule', {
					module: MODULE.AUTH,
					subStore: MODULE_SUB_STORE.AUTH.DATA,
					limit: BATCH_SIZE,
					offset,
				});

				const authDataSubstoreInfos = authModuleData[MODULE_SUB_STORE.AUTH.DATA];

				for (let i = 0; i < authDataSubstoreInfos.length; i++) {
					const { address, authAccount } = authDataSubstoreInfos[i];

					const addressFormatted =
						address.length !== 20 * 2 ? getKlayr32AddressFromHexAddress(address) : address;

					await addGenesisBlockJob('indexGenesisAuthAccount', {
						address: addressFormatted,
						nonce: authAccount.nonce,
						numberOfSignatures: authAccount.numberOfSignatures,
						mandatoryKeys: authAccount.mandatoryKeys,
						optionalKeys: authAccount.optionalKeys,
					});
				}

				const percent =
					totalAuthData > 0 ? (((offset + BATCH_SIZE) / totalAuthData) * 100).toFixed(1) : 0;
				logger.info(
					`Scheduled ${Math.min(
						offset + BATCH_SIZE,
						totalAuthData,
					)} of ${totalAuthData} auth item (${percent}%)`,
				);

				offset += BATCH_SIZE;
			} catch (err) {
				await new Promise(resolve => setTimeout(resolve, BATCH_RETRY_DELAY));
				logger.warn(`Retrying indexGenesisAuthAccount batch starting at offset ${offset}...`);
			}
		}
	}

	logger.info('Finished indexing all the genesis assets from the Auth module.');
};

module.exports = { indexAuthModuleAssets };
