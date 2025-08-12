const { TokenEventResult } = require('../constants');
const { recordTokenBalanceAddition } = require('../shared/balances');
const { recordTokenUnescrowed } = require('../shared/escrowed');

const recoverController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordTokenUnescrowed(
			event.data.terminatedChainID,
			event.data.tokenID,
			event.data.amount,
			isBlockDeletion,
		);

		if (event.topics.length !== 2)
			throw new Error(`event topics for ${event.name} is not 2, got: [${event.topics.toString()}]`);

		const address = event.topics[1];
		recordTokenBalanceAddition(address, event.data.tokenID, event.data.amount, isBlockDeletion);
	}
};

module.exports = { recoverController };
