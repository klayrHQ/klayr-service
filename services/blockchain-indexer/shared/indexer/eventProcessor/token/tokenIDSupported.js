const { recordSupportTokenID } = require('../../../dataService/recorder/token/supported');

const tokenIDSupportedController = async (event, isBlockDeletion) => {
	recordSupportTokenID(event.tokenID, isBlockDeletion);
};

module.exports = { tokenIDSupportedController };
