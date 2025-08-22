const { recordUnsupportTokenID } = require('../../../dataService/recorder/token/supported');

const tokenIDSupportRemovedController = async (event, isBlockDeletion) => {
	recordUnsupportTokenID(event.tokenID, isBlockDeletion);
};

module.exports = { tokenIDSupportRemovedController };
