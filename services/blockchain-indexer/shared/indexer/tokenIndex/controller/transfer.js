const { TokenEventResult } = require('../constants');
const { recordTokenBalanceAddition, recordTokenBalanceRemoval } = require('../shared/balances');

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
