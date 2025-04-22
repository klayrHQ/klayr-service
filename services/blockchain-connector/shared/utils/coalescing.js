/*
 * Utility for coalescing requests with a time window (TTL) to avoid duplicate work.
 *
 * This module exports functions to:
 *  - coalesceRequest: deduplicate in-flight calls and cache results for a TTL window
 *  - makeCoalescingKey: generate stable keys
 *  - isRequestCoalescingNeeded: detect if a call will be coalesced (in-flight or cached)
 *  - pruneCaches: clean old cache entries
 *
 * Usage:
 *   const { coalesceRequest, makeCoalescingKey } = require('./requestCoalescing');
 *
 *   async function getBlock(height) {
 *     const key = makeCoalescingKey('chain_getBlockByHeight', { height });
 *     return coalesceRequest(key, () => invokeEndpoint('chain_getBlockByHeight', { height }));
 *   }
 */

const stringify = require('json-stable-stringify');
const { Logger } = require('klayr-service-framework');
const logger = Logger();

const config = require('../../config');

// variables
let interval;
const inFlightRequests = new Map();
const resultCache = new Map();

// constants
const DEFAULT_TTL_MS = config.coalescing.ttl;
const PRUNE_INTERVAL_MS = 60000;

/**
 * Generates a consistent key based on function name and ordered args.
 * @param {string} functionName
 * @param {...any} args
 * @returns {string}
 */
function makeCoalescingKey(functionName, ...args) {
	return `${functionName}|${stringify(args)}`;
}

/**
 * Checks if a request for the given key is either in-flight or cached (within TTL).
 * @param {string} key
 * @returns {boolean}
 */
function isRequestCoalescingNeeded(functionName, ...args) {
	const key = makeCoalescingKey(functionName, ...args);
	const now = Date.now();
	if (inFlightRequests.has(key)) {
		return true;
	}
	const entry = resultCache.get(key);
	return entry && now - entry.timestamp <= DEFAULT_TTL_MS;
}

/**
 * Coalesces concurrent or repeated calls for the same key.
 * If an in-flight promise exists, returns it.
 * If a cached result exists within TTL, returns it.
 * Otherwise, calls fn() to get a new result, caches it for TTL, and returns it.
 *
 * @template T
 * @param {string} key - Unique identifier for the request
 * @param {() => Promise<T>} fn - Function that performs the actual work
 * @returns {Promise<T>}
 */
function coalesceRequest(key, fn) {
	if (!interval) interval = setInterval(pruneCaches, PRUNE_INTERVAL_MS);

	const now = Date.now();

	// 1. If in-flight, return existing promise
	if (inFlightRequests.has(key)) {
		logger.trace(`[requestCoalescing] Reusing in-flight request for key: ${key}`);
		return inFlightRequests.get(key);
	}

	// 2. If cached result within TTL, return it
	const cacheEntry = resultCache.get(key);
	if (cacheEntry && now - cacheEntry.timestamp <= DEFAULT_TTL_MS) {
		logger.trace(`[requestCoalescing] Returning cached result for key within TTL: ${key}`);
		return Promise.resolve(cacheEntry.result);
	}

	// 3. Otherwise, start a new request
	const promise = (async () => {
		try {
			const result = await fn();
			// Cache result
			resultCache.set(key, { result, timestamp: Date.now() });
			// Schedule removal after TTL
			setTimeout(() => {
				const entry = resultCache.get(key);
				if (entry && Date.now() - entry.timestamp >= DEFAULT_TTL_MS) {
					resultCache.delete(key);
					logger.trace(`[requestCoalescing] Cleared cached result for key: ${key}`);
				}
			}, DEFAULT_TTL_MS);
			return result;
		} catch (err) {
			throw err;
		} finally {
			// Remove from in-flight
			inFlightRequests.delete(key);
			logger.trace(`[requestCoalescing] Cleared in-flight request for key: ${key}`);
		}
	})();

	inFlightRequests.set(key, promise);
	logger.trace(`[requestCoalescing] Created new in-flight request for key: ${key}`);
	return promise;
}

/**
 * Periodically prune stale entries from both in-flight and result caches.
 */
function pruneCaches() {
	const now = Date.now();
	// Prune result cache
	for (const [key, { timestamp }] of resultCache.entries()) {
		if (now - timestamp > DEFAULT_TTL_MS) {
			resultCache.delete(key);
		}
	}
	// Note: in-flight entries are cleaned up on resolution
	logger.trace('[requestCoalescing] Pruned caches');
}

module.exports = {
	coalesceRequest,
	makeCoalescingKey,
	isRequestCoalescingNeeded,
};
