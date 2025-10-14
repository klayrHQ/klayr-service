const {
	setPendingIndexerLastCurrentHeight,
} = require('../../shared/indexer/pendingBlockchainIndex');
const { setIsSchedulingThroughCoordinator } = require('../../shared/indexer/readyIndex');
const { getReorderingStatus } = require('../../shared/indexer/utils/blockchainIndex');

module.exports = [
	{
		name: 'setPendingIndexerLastCurrentHeight',
		controller: async ({ currentHeight }) => setPendingIndexerLastCurrentHeight(currentHeight),
		params: {
			currentHeight: { optional: false, type: 'number' },
		},
	},
	{
		name: 'setIsSchedulingThroughCoordinator',
		controller: async () => setIsSchedulingThroughCoordinator(),
		params: {},
	},
	{
		name: 'getReorderingStatus',
		controller: async () => getReorderingStatus(),
		params: {},
	},
];
