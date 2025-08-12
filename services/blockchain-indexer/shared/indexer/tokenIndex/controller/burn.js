const { TokenEventResult } = require('../constants');
const { recordTokenBalanceRemoval } = require('../shared/balances');
const { recordTokenSupplyDecrease } = require('../shared/supply');

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
