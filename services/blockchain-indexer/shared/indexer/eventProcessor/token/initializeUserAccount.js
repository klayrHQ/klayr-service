const { recordAccountInitialization } = require('../../../dataService/recorder/token/account');
const { TokenEventResult } = require('../../../dataService/recorder/token/constants');

const initializeUserAccountController = async (event, isBlockDeletion) => {
	if (event.data.result === TokenEventResult.SUCCESSFUL) {
		recordAccountInitialization(event.data.address, event.data.tokenID, isBlockDeletion);
	}
};

module.exports = { initializeUserAccountController };
