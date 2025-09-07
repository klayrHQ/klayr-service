const { TokenEventResult } = require('../../../dataService/recorder/token/constants');
const { recordTokenSupplyIncrease } = require('../../../dataService/recorder/token/supply');

const initializeTokenController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordTokenSupplyIncrease(event.data.tokenID, 0, isBlockDeletion);
	}
};

module.exports = { initializeTokenController };
