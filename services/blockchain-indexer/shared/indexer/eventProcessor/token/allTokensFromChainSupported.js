const {
	recordSupportAllTokenFromChainID,
} = require('../../../dataService/recorder/token/supported');

const allTokensFromChainSupportedController = async (event, isBlockDeletion) => {
	recordSupportAllTokenFromChainID(event.chainID, isBlockDeletion);
};

module.exports = { allTokensFromChainSupportedController };
