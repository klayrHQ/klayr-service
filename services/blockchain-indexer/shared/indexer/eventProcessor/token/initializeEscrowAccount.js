const { TokenEventResult } = require('../../../dataService/recorder/token/constants');
const { recordTokenEscrowed } = require('../../../dataService/recorder/token/escrowed');

const initializeEscrowAccountController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordTokenEscrowed(event.data.chainID, event.data.tokenID, 0, isBlockDeletion);
	}
};

module.exports = { initializeEscrowAccountController };
