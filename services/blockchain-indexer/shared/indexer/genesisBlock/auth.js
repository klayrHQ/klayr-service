const { Logger } = require('klayr-service-framework');
const { MODULE, MODULE_SUB_STORE } = require('../../constants');

const requestAll = require('../../utils/requestAll');
const { requestConnector } = require('../../utils/request');
const { getKlayr32AddressFromHexAddress } = require('../../utils/account');
const { addGenesisBlockJob } = require('./queue');

const logger = Logger();

const indexAuthModuleAssets = async dbTrx => {
	logger.info('Starting to index the genesis assets from the auth module.');

	const genesisBlockAssetsLength = await requestConnector('getGenesisAssetsLength', {
		module: MODULE.AUTH,
	});

	if (Object.keys(genesisBlockAssetsLength).includes(MODULE.AUTH)) {
		const totalAuthData = genesisBlockAssetsLength[MODULE.AUTH][MODULE_SUB_STORE.AUTH.DATA];

		const authModuleData = await requestAll(
			requestConnector,
			'getGenesisAssetByModule',
			{ module: MODULE.AUTH, subStore: MODULE_SUB_STORE.AUTH.DATA, limit: 10000 },
			totalAuthData,
		);

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
	}

	logger.info('Finished indexing all the genesis assets from the Auth module.');
};

module.exports = { indexAuthModuleAssets };
