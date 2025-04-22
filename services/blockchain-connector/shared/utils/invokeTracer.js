const stringify = require('json-stable-stringify');

const callHistory = new Map();

// Constants
const DEFAULT_WINDOW_MS = 1000;
const MAX_HISTORY_AGE_MS = 10000;
const PRUNE_INTERVAL_MS = 10000;

let interval;

/**
 * Generates a consistent key based on function name and ordered args.
 * @param {string} functionName
 * @param {any[]} args
 * @returns {string}
 */
const generateCallKey = (functionName, args) => {
	return `${functionName}|${stringify(args)}`;
};

/**
 * Parses key back into readable format for logging.
 * @param {string} key
 * @returns {{ functionName: string, args: any[] }}
 */
const parseCallKey = key => {
	const [functionName, argStr] = key.split('|', 2);
	try {
		return { functionName, args: JSON.parse(argStr) };
	} catch {
		return { functionName, args: [] };
	}
};

/**
 * Records a function call and returns how many times it has been called in the given time window.
 * @param {string} functionName
 * @param {...any} args
 * @returns {number}
 */
const recordInvocation = (functionName, ...args) => {
	if (!interval) interval = setInterval(pruneOldRecords, PRUNE_INTERVAL_MS);

	const key = generateCallKey(functionName, args);
	const now = Date.now();

	if (!callHistory.has(key)) {
		callHistory.set(key, []);
	}

	const timestamps = callHistory.get(key);
	const recent = timestamps.filter(ts => now - ts <= DEFAULT_WINDOW_MS);
	recent.push(now);
	callHistory.set(key, recent);

	return recent.length;
};

/**
 * Logs current call stats before pruning, sorted by most calls,
 * but only for calls made more than once.
 */
const logStats = () => {
	const allStats = [];

	for (const [key, timestamps] of callHistory.entries()) {
		if (timestamps.length <= 1) continue;
		const { functionName, args } = parseCallKey(key);
		allStats.push({
			functionName,
			args,
			count: timestamps.length,
		});
	}

	allStats.sort((a, b) => b.count - a.count);

	if (allStats.length > 0) {
		console.log('📊 [invokeTracker] Invocation Stats Before Prune (Sorted, Count > 1):');
		for (const stat of allStats) {
			console.log(
				`- [${stat.functionName}] (${stat.args.map(a => JSON.stringify(a)).join(', ')}) => ${
					stat.count
				} calls`,
			);
		}
	} else {
		console.log(
			`📊 [invokeTracker] No Repeated Invocation Detected For Time Window: ${DEFAULT_WINDOW_MS} ms`,
		);
	}
};

/**
 * Prunes old call timestamps and logs stats before pruning.
 */
const pruneOldRecords = () => {
	logStats();
	const now = Date.now();
	for (const [key, timestamps] of callHistory.entries()) {
		const recent = timestamps.filter(ts => now - ts <= MAX_HISTORY_AGE_MS);
		if (recent.length > 0) {
			callHistory.set(key, recent);
		} else {
			callHistory.delete(key);
		}
	}
};

module.exports = {
	recordInvocation,
};
