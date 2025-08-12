const { TokenEventResult, CCMProcessedResult } = require('../constants');
const { recordTokenBalanceAddition } = require('../shared/balances');
const { getCCM, getRelayer } = require('../shared/context');
const { recordTokenUnescrowed, recordTokenEscrowed } = require('../shared/escrowed');

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
