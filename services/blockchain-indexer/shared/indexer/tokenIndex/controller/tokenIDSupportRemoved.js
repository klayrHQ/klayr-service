const { recordUnsupportTokenID } = require('../shared/supported');

const tokenIDSupportRemovedController = async (event, isBlockDeletion) => {
	recordUnsupportTokenID(event.tokenID, isBlockDeletion);
};

module.exports = { tokenIDSupportRemovedController };
