const { getCurrentChainID } = require('../../../dataService/business/interoperability/chain');
const { TokenEventResult } = require('../constants');
const { recordTokenBalanceRemoval } = require('../shared/balances');
const { recordTokenEscrowed } = require('../shared/escrowed');
const { splitTokenIDString } = require('../utils/token');

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
