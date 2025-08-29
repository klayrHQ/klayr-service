const { requestConnector } = require('./request');

let blockTime;

const getBlockTime = async () => {
	if (typeof blockTime !== 'number') {
		const nodeInfo = await requestConnector('getNodeInfo');
		blockTime = nodeInfo.genesis.blockTime;
	}
	return blockTime;
};

module.exports = {
	getBlockTime,
};
