const { recordTokenBalanceAddition } = require('../../../dataService/recorder/token/balances');
const {
	TokenEventResult,
	CCMProcessedResult,
} = require('../../../dataService/recorder/token/constants');
const { getCCM, getRelayer } = require('../../../dataService/recorder/token/context');
const {
	recordTokenUnescrowed,
	recordTokenEscrowed,
} = require('../../../dataService/recorder/token/escrowed');

const beforeCCMForwardingController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		const ccm = getCCM(event.data.ccmID);
		const ccmFailed = ccm.result !== CCMProcessedResult.FORWARDED;

		if (BigInt(ccm.fee) > BigInt(0)) {
			recordTokenUnescrowed(
				ccm.sendingChainID,
				event.data.messageFeeTokenID,
				ccm.fee,
				isBlockDeletion,
			);

			if (ccmFailed) {
				const relayerAddress = getRelayer(ccm.sendingChainID);
				recordTokenBalanceAddition(
					relayerAddress,
					event.data.messageFeeTokenID,
					ccm.fee,
					isBlockDeletion,
				);
			} else {
				recordTokenEscrowed(
					ccm.receivingChainID,
					event.data.messageFeeTokenID,
					ccm.fee,
					isBlockDeletion,
				);
			}
		}
	}
};

module.exports = { beforeCCMForwardingController };
