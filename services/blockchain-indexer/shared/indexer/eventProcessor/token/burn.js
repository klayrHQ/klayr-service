const { recordTokenBalanceRemoval } = require('../../../dataService/recorder/token/balances');
const { TokenEventResult } = require('../../../dataService/recorder/token/constants');
const { recordTokenSupplyDecrease } = require('../../../dataService/recorder/token/supply');

const burnController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordTokenBalanceRemoval(
			event.data.address,
			event.data.tokenID,
			event.data.amount,
			isBlockDeletion,
		);

		recordTokenSupplyDecrease(event.data.tokenID, event.data.amount, isBlockDeletion);
	}
};

module.exports = { burnController };
