const { requestConnector } = require('./request');

let blockTime;

const getBlockTime = async () => {
	if (typeof blockTime !== 'number') {
		const nodeInfo = await requestConnector('getNodeInfo');
		blockTime = nodeInfo.genesis.blockTime;
	}
	return blockTime;
};

const getTTLBasedOnBlockTime = async ttl => {
	return ['blockTime', 'block'].includes(ttl) ? (await getBlockTime()) * 1000 : ttl * 1000;
};

module.exports = {
	getBlockTime,
	getTTLBasedOnBlockTime,
};
