const {
	recordTokenAvailableBalanceRemoval,
} = require('../../../dataService/recorder/token/balances');
const { TokenEventResult } = require('../../../dataService/recorder/token/constants');
const { recordTokenLocked } = require('../../../dataService/recorder/token/locked');

const lockController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordTokenAvailableBalanceRemoval(
			event.data.address,
			event.data.tokenID,
			event.data.amount,
			isBlockDeletion,
		);
		recordTokenLocked(
			event.data.address,
			event.data.tokenID,
			event.data.module,
			event.data.amount,
			isBlockDeletion,
		);
	}
};

module.exports = { lockController };
