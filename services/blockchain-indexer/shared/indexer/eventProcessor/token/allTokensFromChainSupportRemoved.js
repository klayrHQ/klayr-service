const {
	recordUnsupportAllTokenFromChainID,
} = require('../../../dataService/recorder/token/supported');

const allTokensFromChainSupportRemovedController = async (event, isBlockDeletion) => {
	recordUnsupportAllTokenFromChainID(event.chainID, isBlockDeletion);
};

module.exports = { allTokensFromChainSupportRemovedController };
