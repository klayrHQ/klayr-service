const { recordSupportTokenID } = require('../shared/supported');

const tokenIDSupportedController = async (event, isBlockDeletion) => {
	recordSupportTokenID(event.tokenID, isBlockDeletion);
};

module.exports = { tokenIDSupportedController };
