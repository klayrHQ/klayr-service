const { Logger } = require('klayr-service-framework');
const { MODULE, MODULE_SUB_STORE } = require('../../constants');

const requestAll = require('../../utils/requestAll');
const { requestConnector } = require('../../utils/request');
const { updateAuthAccountDB } = require('../../dataService/recorder/auth/account');

const logger = Logger();

const indexAuthModuleAssets = async dbTrx => {
	logger.info('Starting to index the genesis assets from the auth module.');

	const genesisBlockAssetsLength = await requestConnector('getGenesisAssetsLength', {
		module: MODULE.AUTH,
	});

	const totalAuthData = genesisBlockAssetsLength[MODULE.AUTH][MODULE_SUB_STORE.AUTH.DATA];

	const authModuleData = await requestAll(
		requestConnector,
		'getGenesisAssetByModule',
		{ module: MODULE.AUTH, subStore: MODULE_SUB_STORE.AUTH.DATA, limit: 1000 },
		totalAuthData,
	);

	const authDataSubstoreInfos = authModuleData[MODULE_SUB_STORE.AUTH.DATA];

	const authAccountData = [];
	for (let i = 0; i < authDataSubstoreInfos.length; i++) {
		const { address, authAccount } = authDataSubstoreInfos[i];

		authAccountData.push({
			address,
			nonce: BigInt(authAccount.nonce),
			numberOfSignatures: authAccount.numberOfSignatures,
			mandatoryKeys: authAccount.mandatoryKeys,
			optionalKeys: authAccount.optionalKeys,
		});
	}

	if (authAccountData.length > 0) await updateAuthAccountDB(authAccountData, dbTrx);

	logger.info('Finished indexing all the genesis assets from the Auth module.');
};

module.exports = { indexAuthModuleAssets };
