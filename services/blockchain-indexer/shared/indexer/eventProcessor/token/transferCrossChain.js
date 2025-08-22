const { getCurrentChainID } = require('../../../dataService/business/interoperability/chain');
const { recordTokenBalanceRemoval } = require('../../../dataService/recorder/token/balances');
const { TokenEventResult } = require('../../../dataService/recorder/token/constants');
const { recordTokenEscrowed } = require('../../../dataService/recorder/token/escrowed');
const { splitTokenIDString } = require('../../../dataService/utils/token');

const transferCrossChainController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		const currentChainID = await getCurrentChainID();
		const [chainID] = splitTokenIDString(event.data.tokenID);

		recordTokenBalanceRemoval(
			event.data.senderAddress,
			event.data.tokenID,
			event.data.amount,
			isBlockDeletion,
		);

		if (chainID === currentChainID) {
			recordTokenEscrowed(
				event.data.receivingChainID,
				event.data.tokenID,
				event.data.amount,
				isBlockDeletion,
			);
		}
	}
};

module.exports = { transferCrossChainController };
