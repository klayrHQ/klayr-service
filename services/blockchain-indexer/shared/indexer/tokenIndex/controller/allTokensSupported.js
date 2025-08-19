const { recordSupportAllTokens } = require('../shared/supported');

const allTokensSupportedController = async (_event, isBlockDeletion) => {
	recordSupportAllTokens(isBlockDeletion);
};

module.exports = { allTokensSupportedController };
