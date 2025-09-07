const { TokenEventResult } = require('../../../dataService/recorder/token/constants');
const { getCurrentChainID } = require('../../../dataService/business/interoperability/chain');
const { recordTokenBalanceAddition } = require('../../../dataService/recorder/token/balances');
const { getCCM } = require('../../../dataService/recorder/token/context');
const { recordTokenUnescrowed } = require('../../../dataService/recorder/token/escrowed');
const { splitTokenIDString } = require('../../../dataService/utils/token');

const beforeCCCExecutionController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		const ccm = getCCM(event.data.ccmID);
		const currentChainID = await getCurrentChainID();

		const tokenID = event.data.messageFeeTokenID;
		const [chainID] = splitTokenIDString(tokenID);

		if (chainID === currentChainID) {
			recordTokenUnescrowed(ccm.sendingChainID, tokenID, ccm.fee, isBlockDeletion);
		}

		recordTokenBalanceAddition(event.data.relayerAddress, tokenID, ccm.fee, isBlockDeletion);
	}
};

module.exports = { beforeCCCExecutionController };
