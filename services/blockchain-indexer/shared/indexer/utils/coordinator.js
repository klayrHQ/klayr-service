const { getAppContext } = require('../../utils/request');

let coordinatorReady = false;

// since coordinator is dependent on indexer, we use this function to prevent circular dependency between indexer <> coordinator
const waitForCoordinatorReady = async () => {
	if (coordinatorReady) return;
	await getAppContext().getBroker().waitForServices('coordinator');
	coordinatorReady = true;
	return;
};

module.exports = { waitForCoordinatorReady };
