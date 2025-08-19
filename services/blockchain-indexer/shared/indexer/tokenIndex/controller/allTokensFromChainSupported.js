const { recordSupportAllTokenFromChainID } = require('../shared/supported');

const allTokensFromChainSupportedController = async (event, isBlockDeletion) => {
	recordSupportAllTokenFromChainID(event.chainID, isBlockDeletion);
};

module.exports = { allTokensFromChainSupportedController };
