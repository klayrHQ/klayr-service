const {
	setPendingIndexerLastCurrentHeight,
} = require('../../shared/indexer/pendingBlockchainIndex');
const { scheduleIndexMissingTotalSupply } = require('../../shared/indexer/blockchainIndex');
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
		name: 'scheduleIndexMissingTotalSupply',
		controller: async () => scheduleIndexMissingTotalSupply(),
		params: {},
	},
	{
		name: 'setIsSchedulingThroughCoordinator',
		controller: async () => setIsSchedulingThroughCoordinator(),
		params: {},
	},
];
