const { getAppContext } = require('./utils/request');

let indexerReady = false;

const waitForIndexerReady = async () => {
	if (indexerReady) return;
	await getAppContext().getBroker().waitForServices('indexer');
	indexerReady = true;
	return;
};

module.exports = { waitForIndexerReady };
