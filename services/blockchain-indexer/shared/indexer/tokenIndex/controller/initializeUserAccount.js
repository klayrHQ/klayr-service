const { TokenEventResult } = require('../constants');
const { recordAccountInitialization } = require('../shared/account');

const initializeUserAccountController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordAccountInitialization(event.data.address, event.data.tokenID, isBlockDeletion);
	}
};

module.exports = { initializeUserAccountController };
