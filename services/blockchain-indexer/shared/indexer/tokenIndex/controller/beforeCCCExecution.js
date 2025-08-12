const { getCurrentChainID } = require('../../../dataService/business/interoperability/chain');
const { TokenEventResult, CCMProcessedResult, CCMProcessedCode } = require('../constants');
const { recordTokenBalanceAddition } = require('../shared/balances');
const { getCCM } = require('../shared/context');
const { recordTokenUnescrowed } = require('../shared/escrowed');
const { splitTokenIDString } = require('../utils/token');

const beforeCCCExecutionController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		const ccm = getCCM(event.data.ccmID);

		if (ccm.result === CCMProcessedResult.APPLIED && ccm.code === CCMProcessedCode.SUCCESS) {
			const currentChainID = await getCurrentChainID();

			const tokenID = event.data.messageFeeTokenID;
			const [chainID] = splitTokenIDString(tokenID);

			if (chainID === currentChainID) {
				recordTokenUnescrowed(ccm.sendingChainID, tokenID, ccm.fee, isBlockDeletion);
			}

			recordTokenBalanceAddition(event.data.relayerAddress, tokenID, ccm.fee, isBlockDeletion);
		}
	}
};

module.exports = { beforeCCCExecutionController };
