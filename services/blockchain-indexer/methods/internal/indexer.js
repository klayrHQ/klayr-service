const {
	setPendingIndexerLastCurrentHeight,
} = require('../../shared/indexer/pendingBlockchainIndex');
const { scheduleIndexMissingTotalSupply } = require('../../shared/indexer/blockchainIndex');

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
];
