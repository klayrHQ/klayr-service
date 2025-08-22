const {
	recordTokenAvailableBalanceAddition,
} = require('../../../dataService/recorder/token/balances');
const { TokenEventResult } = require('../../../dataService/recorder/token/constants');
const { recordTokenUnlocked } = require('../../../dataService/recorder/token/locked');

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
