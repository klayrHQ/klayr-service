const { TokenEventResult } = require('../constants');
const { recordTokenSupplyIncrease } = require('../shared/supply');

const initializeTokenController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordTokenSupplyIncrease(event.data.tokenID, 0, isBlockDeletion);
	}
};

module.exports = { initializeTokenController };
