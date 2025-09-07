const { getActiveNodeClientActive, getNodeQueueSize } = require('./sdk/client');

const getWorkloadScore = async () => {
	try {
		const healthyNodes = await getActiveNodeClientActive();

		if (!healthyNodes || healthyNodes.length === 0) {
			return 0;
		}

		const totalQueue = healthyNodes.reduce((sum, node) => sum + getNodeQueueSize(node), 0);
		const workload = totalQueue / healthyNodes.length;
		return { workload };
	} catch (err) {
		logger.warn(`Failed to update workloadScore: ${err.message}`);
		return { workload: -1 };
	}
};

module.exports = {
	getWorkloadScore,
};
