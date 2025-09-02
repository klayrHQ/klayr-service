const {
	Utils: { waitForIt },
} = require('klayr-service-framework');
const { getAppContext } = require('./request');

let indexerReady = false;
let indexerStatusReady = false;

const waitForIndexerReady = async () => {
	if (indexerReady) return;
	await getAppContext().getBroker().waitForServices('indexer');
	indexerReady = true;
	return;
};

const waitForIndexerStatusReady = async () => {
	if (indexerStatusReady) return;

	await waitForIt(async () => {
		try {
			const indexerStatus = await requestIndexer('status');
			if (indexerStatus.isReady) {
				indexerStatusReady = true;
				return true;
			} else {
				return undefined;
			}
		} catch (err) {
			return undefined;
		}
	}, 1000);

	return true;
};

module.exports = { waitForIndexerReady, waitForIndexerStatusReady };
