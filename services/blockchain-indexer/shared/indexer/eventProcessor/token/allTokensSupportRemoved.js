const { recordUnsupportAllTokens } = require('../../../dataService/recorder/token/supported');

const allTokensSupportRemovedController = async (_event, isBlockDeletion) => {
	recordUnsupportAllTokens(isBlockDeletion);
};

module.exports = { allTokensSupportRemovedController };
