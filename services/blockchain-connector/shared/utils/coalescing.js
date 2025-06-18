const { Logger } = require('klayr-service-framework');

const config = require('../../config');
const { ReqoalInstance } = require('reqoal');

// constants
const DEFAULT_TTL_MS = config.coalescingTTL;
const PRUNE_INTERVAL_MS = 60000;

// instance
let coalescer;

const getCoalescerInstance = () => {
	if (!coalescer) {
		coalescer = new ReqoalInstance(PRUNE_INTERVAL_MS, DEFAULT_TTL_MS, Logger);
	}
	return coalescer;
};

module.exports = { getCoalescerInstance };
