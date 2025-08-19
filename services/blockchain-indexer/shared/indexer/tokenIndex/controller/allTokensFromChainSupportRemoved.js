const { recordUnsupportAllTokenFromChainID } = require('../shared/supported');

const allTokensFromChainSupportRemovedController = async (event, isBlockDeletion) => {
	recordUnsupportAllTokenFromChainID(event.chainID, isBlockDeletion);
};

module.exports = { allTokensFromChainSupportRemovedController };
