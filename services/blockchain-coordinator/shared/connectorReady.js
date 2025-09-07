const {
	Utils: { waitForIt },
} = require('klayr-service-framework');
const { requestConnector, getAppContext } = require('./utils/request');

let connectorReady = false;
let connectorStatusReady = false;

const waitForConnectorReady = async () => {
	if (connectorReady) return;
	await getAppContext().getBroker().waitForServices('connector');
	connectorReady = true;
	return;
};

const waitForConnectorStatusReady = async () => {
	if (connectorStatusReady) return;

	await waitForIt(async () => {
		try {
			const connectorStatus = await requestConnector('status');
			if (connectorStatus.isReady) {
				connectorStatusReady = true;
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

const waitForConnectorWorkloadReady = async () => {
	await waitForIt(async () => {
		try {
			const connectorWorkload = await requestConnector('workload');
			if (connectorWorkload.workload < 1) {
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

module.exports = {
	waitForConnectorReady,
	waitForConnectorStatusReady,
	waitForConnectorWorkloadReady,
};
