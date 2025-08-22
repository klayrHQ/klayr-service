const { recordTokenBalanceAddition } = require('../../../dataService/recorder/token/balances');
const { TokenEventResult } = require('../../../dataService/recorder/token/constants');
const { recordTokenSupplyIncrease } = require('../../../dataService/recorder/token/supply');

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
