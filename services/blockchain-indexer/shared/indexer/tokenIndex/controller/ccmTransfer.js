const { getCurrentChainID } = require('../../../dataService/business/interoperability/chain');
const { TokenEventResult } = require('../constants');
const { recordTokenBalanceAddition } = require('../shared/balances');
const { getCCM } = require('../shared/context');
const { getCcmIDFromCcmTransferEvent } = require('../shared/context/ccm');
const { recordTokenUnescrowed } = require('../shared/escrowed');
const { splitTokenIDString } = require('../utils/token');

const ccmTransferController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		const currentChainID = await getCurrentChainID();
		const [chainID] = splitTokenIDString(event.data.tokenID);

		if (chainID === currentChainID) {
			const ccmID = getCcmIDFromCcmTransferEvent(event.data);
			const ccm = getCCM(ccmID);
			const sendingChainID = ccm.sendingChainID;
			recordTokenUnescrowed(sendingChainID, event.data.tokenID, event.data.amount, isBlockDeletion);
		}

		recordTokenBalanceAddition(
			event.data.recipientAddress,
			event.data.tokenID,
			event.data.amount,
			isBlockDeletion,
		);
	}
};

module.exports = { ccmTransferController };
