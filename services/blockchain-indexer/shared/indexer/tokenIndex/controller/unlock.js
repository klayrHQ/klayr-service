const { TokenEventResult } = require('../constants');
const { recordTokenAvailableBalanceAddition } = require('../shared/balances');
const { recordTokenUnlocked } = require('../shared/locked');

const unlockController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordTokenAvailableBalanceAddition(
			event.data.address,
			event.data.tokenID,
			event.data.amount,
			isBlockDeletion,
		);

		recordTokenUnlocked(
			event.data.address,
			event.data.tokenID,
			event.data.module,
			event.data.amount,
			isBlockDeletion,
		);
	}
};

module.exports = { unlockController };
