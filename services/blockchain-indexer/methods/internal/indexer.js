const {
	setPendingIndexerLastCurrentHeight,
} = require('../../shared/indexer/pendingBlockchainIndex');
const { setIsSchedulingThroughCoordinator } = require('../../shared/indexer/readyIndex');

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
];
