const { getGenesisHeight } = require('../../constants');
const { getIndexReadyStatus, getIsSchedulingThroughCoordinator } = require('../readyIndex');
const { getReorderingStatus } = require('./blockchainIndex');
const { requestCoordinator } = require('../../utils/request');
const { waitForCoordinatorReady } = require('./coordinator');

const scheduleMissingBlocksOnCoordinator = async () => {
	await waitForCoordinatorReady();
	await requestCoordinator('scheduleMissingBlocksIndexing');
};

const shouldScheduleMissingBlocks = async currentBlock => {
	const indexReady = getIndexReadyStatus();
	const isScheduledThroughCoordinator = getIsSchedulingThroughCoordinator();
	const isReordering = getReorderingStatus();
	const genesisHeight = await getGenesisHeight();

	// only schedule missing blocks indexing if the index is not ready, not scheduled through coordinator,
	// is not reordering, and the current block height is greater than genesis height
	return (
		!indexReady &&
		!isScheduledThroughCoordinator &&
		!isReordering &&
		currentBlock.header.height > genesisHeight
	);
};

module.exports = { scheduleMissingBlocksOnCoordinator, shouldScheduleMissingBlocks };
