const { getCurrentChainID } = require('../../../dataService/business/interoperability/chain');
const { recordTokenBalanceAddition } = require('../../../dataService/recorder/token/balances');
const { TokenEventResult } = require('../../../dataService/recorder/token/constants');
const { getCCM } = require('../../../dataService/recorder/token/context');
const { getCcmIDFromCcmTransferEvent } = require('../../../dataService/recorder/token/context/ccm');
const { recordTokenUnescrowed } = require('../../../dataService/recorder/token/escrowed');
const { splitTokenIDString } = require('../../../dataService/utils/token');

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
