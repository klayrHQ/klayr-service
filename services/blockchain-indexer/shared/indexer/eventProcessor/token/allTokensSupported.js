const { recordSupportAllTokens } = require('../../../dataService/recorder/token/supported');

const allTokensSupportedController = async (_event, isBlockDeletion) => {
	recordSupportAllTokens(isBlockDeletion);
};

module.exports = { allTokensSupportedController };
