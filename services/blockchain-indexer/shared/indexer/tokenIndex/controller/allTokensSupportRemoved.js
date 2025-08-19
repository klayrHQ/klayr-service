const { recordUnsupportAllTokens } = require('../shared/supported');

const allTokensSupportRemovedController = async (_event, isBlockDeletion) => {
	recordUnsupportAllTokens(isBlockDeletion);
};

module.exports = { allTokensSupportRemovedController };
