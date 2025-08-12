const { TokenEventResult } = require('../constants');
const { recordTokenBalanceRemoval } = require('../shared/balances');
const { recordTokenLocked } = require('../shared/locked');

const lockController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordTokenBalanceRemoval(
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
