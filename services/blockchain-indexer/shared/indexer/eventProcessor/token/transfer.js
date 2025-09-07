const {
	recordTokenBalanceRemoval,
	recordTokenBalanceAddition,
} = require('../../../dataService/recorder/token/balances');
const { TokenEventResult } = require('../../../dataService/recorder/token/constants');

const transferController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordTokenBalanceRemoval(
			event.data.senderAddress,
			event.data.tokenID,
			event.data.amount,
			isBlockDeletion,
		);

		recordTokenBalanceAddition(
			event.data.recipientAddress,
			event.data.tokenID,
			event.data.amount,
			isBlockDeletion,
		);
	}
};

module.exports = { transferController };
