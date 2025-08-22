const BluebirdPromise = require('bluebird');
const { getCcmID, getCcmIDForTokenCrossChainTransfer } = require('./ccm');
const { getKlayr32AddressFromPublicKey } = require('../../../../utils/account');

const tokenIndexerContext = new Map();

const setTokenIndexerContext = (key, itemID, value) => {
	tokenIndexerContext.set(`${key}:${itemID}`, value);
};

const getTokenIndexerContext = (key, itemID) => {
	if (!tokenIndexerContext.has(`${key}:${itemID}`))
		throw new Error(`tokenIndexerContext with key "${key}:${itemID}" not found`);
	return tokenIndexerContext.get(`${key}:${itemID}`);
};

const clearTokenIndexerContext = () => {
	tokenIndexerContext.clear();
};

const initTokenIndexerContext = async (block, events) => {
	await BluebirdPromise.map(
		events,
		async event => {
			if (
				event.module === 'interoperability' &&
				event.name === 'ccmProcessed' &&
				event.data.ccm !== undefined
			) {
				const ccmID = getCcmID(event.data.ccm);
				setTokenIndexerContext('ccm', ccmID, {
					...event.data.ccm,
					result: event.data.result,
					code: event.data.code,
				});

				if (
					event.data.ccm.module === 'token' &&
					event.data.ccm.crossChainCommand === 'transferCrossChain'
				) {
					const ccmIDCCTransfer = getCcmIDForTokenCrossChainTransfer(event.data.ccm);
					setTokenIndexerContext('ccm', ccmIDCCTransfer, {
						...event.data.ccm,
						result: event.data.result,
						code: event.data.code,
					});
				}
			}
		},
		{ concurrency: events.length },
	);

	await BluebirdPromise.map(
		block.transactions,
		async transaction => {
			if (
				transaction.module === 'interoperability' &&
				transaction.command === 'submitMainchainCrossChainUpdate'
			) {
				const sendingChainID = transaction.params.sendingChainID;
				const relayerAddress = getKlayr32AddressFromPublicKey(transaction.senderPublicKey);
				setTokenIndexerContext('relayer', sendingChainID, { relayerAddress });
			}
		},
		{ concurrency: block.transactions.length },
	);
};

const getCCM = ccmID => getTokenIndexerContext('ccm', ccmID);

const getRelayer = sendingChainID =>
	getTokenIndexerContext('relayer', sendingChainID).relayerAddress;

module.exports = {
	getCCM,
	getRelayer,
	clearTokenIndexerContext,
	initTokenIndexerContext,
};
