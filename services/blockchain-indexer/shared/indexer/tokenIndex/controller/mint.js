const { TokenEventResult } = require('../constants');
const { recordTokenBalanceAddition } = require('../shared/balances');
const { recordTokenSupplyIncrease } = require('../shared/supply');

const mintController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordTokenBalanceAddition(
			event.data.address,
			event.data.tokenID,
			event.data.amount,
			isBlockDeletion,
		);

		recordTokenSupplyIncrease(event.data.tokenID, event.data.amount, isBlockDeletion);
	}
};

module.exports = { mintController };
