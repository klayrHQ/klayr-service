/* eslint-disable no-use-before-define */
/*
 * Klayrhq/klayrservice
 * Copyright © 2022 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
const {
	Logger,
	Signals,
	HTTP,
	Exceptions: { TimeoutException },
	Utils: { delay, isObject },
} = require('klayr-service-framework');
const { createWSClient, createIPCClient } = require('@klayr/api-client');
const isReachable = require('is-reachable');

const crypto = require('crypto');

const config = require('../../config');
const { createQueueInstance } = require('../utils/queue');
const { getCoalescerInstance } = require('../utils/coalescing');

const logger = Logger();

// Constants
const ERROR_CONN_REFUSED = 'ECONNREFUSED';
const STATUS_HTTP_TIMEOUT = 'ETIMEDOUT';
const MESSAGE_RPC_TIMEOUT = 'Response not received in';
const TIMEOUT_REGEX_STR = `(?:${STATUS_HTTP_TIMEOUT}|${MESSAGE_RPC_TIMEOUT})`;
const TIMEOUT_REGEX = new RegExp(TIMEOUT_REGEX_STR);
const INSTANTIATION_STATS_CHECK_INTERVAL = 5 * 60 * 1000;

const MAX_CLIENT_POOL_SIZE = config.apiClient.poolSize;
const NUM_REQUEST_RETRIES = config.apiClient.request.maxRetries;
const ENDPOINT_INVOKE_RETRY_DELAY = config.apiClient.request.retryDelay;
const WS_SERVER_PING_INTERVAL = config.apiClient.wsServerPingInterval;
const WS_SERVER_PING_BUFFER = config.apiClient.pingIntervalBuffer; // In case the server is under stress
const WS_SERVER_PING_THRESHOLD = WS_SERVER_PING_INTERVAL + WS_SERVER_PING_BUFFER;

// Caching
const globalClientInstantiationStats = {
	attempts: 0,
	success: 0,
	fail: 0,
};

let lastUsedIndex = 0;
const nodeClientPool = [];

async function getNodeClientActiveSize(node) {
	return node.url.startsWith('http')
		? (await isReachable(`${node.url}/rpc`))
			? 1
			: 0
		: node.clientPool.filter(client => client && client._channel && client._channel.isAlive).length;
}

async function getActiveNodeClientActive() {
	return nodeClientPool.filter(async node => (await getNodeClientActiveSize(node)) > 0);
}

function getEventSubscriberNodeURL() {
	const isConfigValueExist =
		nodeClientPool.findIndex(node => node.url === config.endpoints.klayrEventSubscriber) > -1;
	if (isConfigValueExist) return config.endpoints.klayrEventSubscriber;
	return config.endpoints.klayrUrls[0];
}

function getEventSubscriberNode() {
	if (nodeClientPool.length === 0) return undefined;
	const eventSubscriberUrl = getEventSubscriberNodeURL();
	return nodeClientPool.find(node => node.url === eventSubscriberUrl);
}

async function initNodeClientPool() {
	if (nodeClientPool.length > 0) return;

	logger.info(
		'Initializing node client pool with URLs: ' + JSON.stringify(config.endpoints.klayrUrls),
	);

	for (let index = 0; index < config.endpoints.klayrUrls.length; index++) {
		const node = {
			url: config.endpoints.klayrUrls[index],
			clientPool: [],
			queue:
				config.queue.invokeEndpoint.concurrency > 0
					? await createQueueInstance(config.queue.invokeEndpoint.concurrency)
					: undefined,
			instantiationStats: {
				attempts: 0,
				success: 0,
				fail: 0,
			},
			numEndpointInvocations: 0,
			isDedicatedEventSubscriber: false,
			isReInstantiateIntervalRunning: false,
		};
		nodeClientPool.push(node);
		logger.trace(`Adding ${node.url} to node client pool`);
	}

	const eventSubscriberNode = getEventSubscriberNode();
	logger.trace(`Setting ${eventSubscriberNode.url} as dedicated event subscriber`);
	eventSubscriberNode.isDedicatedEventSubscriber = true;

	for (let index = 0; index < config.endpoints.klayrUrls.length; index++) {
		const type = getClientUrlType(config.endpoints.klayrUrls[index]);
		if (type !== 'http') {
			await initClientPool(config.endpoints.klayrUrls[index], MAX_CLIENT_POOL_SIZE);
		} else {
			setInterval(async () => {
				const stats = await getApiClientStats(config.endpoints.klayrUrls[index]);
				logger.info(
					`HTTP client at node ${config.endpoints.klayrUrls[index]} stats: ${JSON.stringify({
						queueSize: stats.queueSize,
						numEndpointInvocations: stats.numEndpointInvocations,
					})}`,
				);
			}, INSTANTIATION_STATS_CHECK_INTERVAL);
		}
	}
}

async function initNodeClientPoolIfEmpty() {
	if (nodeClientPool.length === 0) {
		await initNodeClientPool();
		return true;
	}
	return false;
}

function getNodeQueueSize(node) {
	if (!node.queue) return 0;
	return node.queue.size + node.queue.pending;
}

async function getLeastLoadedNode() {
	if (await initNodeClientPoolIfEmpty()) {
		lastUsedIndex++;
		const node = nodeClientPool[lastUsedIndex % nodes.length];
		logger.trace(`Selected initial node ${node.url}`);
		return node;
	}

	// 1. Filter only healthy nodes
	const healthyNodes = await getActiveNodeClientActive();
	if (healthyNodes.length === 0) {
		logger.error('getLeastLoadedNode Error: No healthy nodes available!');
		throw new Error('No healthy nodes available');
	}

	// 2. Find the minimum active requests
	// eslint-disable-next-line no-unused-vars
	const minLoad = Math.min(...healthyNodes.map(n => getNodeQueueSize(n)));

	// 3. Collect all nodes with that min load
	const candidates = healthyNodes.filter(
		// eslint-disable-next-line no-unused-vars
		n => getNodeQueueSize(n) <= minLoad,
	);

	// 4. Round-robin selection among candidates
	const selected = candidates[lastUsedIndex % candidates.length];
	lastUsedIndex++;

	logger.trace(`Selected node ${selected.url} with load ${getNodeQueueSize(selected)}`);
	return selected;
}

async function getNodeClient(url) {
	await initNodeClientPoolIfEmpty();
	const node = nodeClientPool.find(n => n.url === url);
	if (!node) {
		logger.error(`getNodeClient Error: Node client for ${url} is not available!`);
		throw new Error(`Node client for ${url} is not available!`);
	}
	return node;
}

const checkIsClientAlive = client => client && client._channel && client._channel.isAlive;

const getApiClientStats = async url => {
	const node = await getNodeClient(url);
	return {
		...node.instantiationStats,
		queueSize: getNodeQueueSize(node),
		activePoolSize: await getNodeClientActiveSize(node),
		expectedPoolSize: MAX_CLIENT_POOL_SIZE,
		numEndpointInvocations: node.numEndpointInvocations,
	};
};

const pingListener = apiClient => {
	if (!isObject(apiClient)) {
		logger.warn(`apiClient is ${JSON.stringify(apiClient)}. Cannot register a pingListener.`);
		return;
	}

	const now = Date.now();
	logger.trace(`Client ${apiClient.poolIndex} at ${apiClient.url} received server ping at ${now}.`);
	clearTimeout(apiClient.pingTimeout);

	apiClient.pingTimeout = setTimeout(() => {
		// Do not reset if the ping was delayed and just received
		const timeSinceLastPing = now - apiClient.lastPingAt;
		if (timeSinceLastPing) {
			logger.warn(
				`No ping for client ${apiClient.poolIndex} from server ${apiClient.url} in ${timeSinceLastPing}ms (last ping: ${apiClient.lastPingAt}).`,
			);
			apiClient._channel.isAlive = false;
			Signals.get('resetApiClient').dispatch(apiClient);
			logger.debug(
				`Dispatched 'resetApiClient' signal from pingListener for API client ${apiClient.poolIndex} at ${apiClient.url}.`,
			);
		}
	}, WS_SERVER_PING_THRESHOLD);

	apiClient.lastPingAt = now;
};

const getClientUrlType = url => {
	if (url.startsWith('http')) return 'http';
	if (url.startsWith('ws')) return 'ws';
	return 'ipc';
};

const instantiateNewClient = async url => {
	const node = await getNodeClient(url);
	globalClientInstantiationStats.attempts++;
	node.instantiationStats.attempts++;

	const urlType = getClientUrlType(url);
	if (urlType === 'http') {
		logger.error('instantiateNewClient Error: API Client instantiation is only for ws or ipc');
		throw new Error('API Client instantiation is only for ws or ipc');
	}

	try {
		const newClient =
			urlType === 'ipc'
				? await createIPCClient(url)
				: await (async () => {
						const client = await createWSClient(`${url}/rpc-ws`);
						client._channel._ws.on('ping', pingListener.bind(null, client));
						return client;
				  })();

		globalClientInstantiationStats.success++;
		node.instantiationStats.success++;

		return newClient;
	} catch (err) {
		globalClientInstantiationStats.fail++;
		node.instantiationStats.fail++;

		const errMessage =
			urlType === 'ipc'
				? `Error instantiating IPC client at ${url}`
				: `Error instantiating WS client to ${url}`;

		logger.error(`${errMessage}: ${err.message}`);
		if (err.message.includes(ERROR_CONN_REFUSED)) {
			logger.error(`instantiateNewClient Error: Unable to connect to the node ${url}`);
			throw new Error(`Unable to connect to the node ${url}`);
		}

		throw err;
	}
};

const initClientPool = async (url, poolSize) => {
	const node = await getNodeClient(url);

	// Set the intervals only at application init
	if (node.clientPool.length === 0) {
		setInterval(async () => {
			const stats = await getApiClientStats(url);
			logger.info(`API client at node ${url} instantiation stats: ${JSON.stringify(stats)}`);
			if (stats.activePoolSize < stats.expectedPoolSize) {
				logger.warn(
					`activePoolSize on ${url} should catch up with the expectedPoolSize, once the node is under less stress.`,
				);
			}
		}, INSTANTIATION_STATS_CHECK_INTERVAL);

		// Re-instantiate interval: Replaces nulls in clientPool with new active apiClients
		// isReInstantiateIntervalRunning is the safety check to skip callback execution if the previous one is already in-progress
		setInterval(async () => {
			if (node.isReInstantiateIntervalRunning) return;
			node.isReInstantiateIntervalRunning = true;

			for (let index = 0; index < node.clientPool.length; index++) {
				const apiClient = node.clientPool[index];

				// eslint-disable-next-line no-continue
				if (isObject(apiClient)) continue;

				// Re-instantiate when null
				const newApiClient = await instantiateNewClient(url)
					.then(client => {
						client.url = url;
						client.poolIndex = index;
						return client;
					})
					// Delay to lower stress on the node
					.catch(() => delay(Math.ceil(2 * WS_SERVER_PING_INTERVAL), null));
				node.clientPool[index] = newApiClient;
				if (node.isDedicatedEventSubscriber === true && newApiClient) {
					Signals.get('newApiClient').dispatch(newApiClient.url, newApiClient.poolIndex);
				}
			}

			node.isReInstantiateIntervalRunning = false;
		}, WS_SERVER_PING_INTERVAL);
	}

	try {
		const startTime = Date.now();
		for (let i = 0; i < poolSize; i++) {
			// Do not instantiate new clients if enough clients already cached
			if (node.clientPool.length >= poolSize) break;

			const newApiClient = await instantiateNewClient(url);
			newApiClient.poolIndex = node.clientPool.length;
			newApiClient.url = url;
			node.clientPool.push(newApiClient);
		}
		logger.info(
			`Initialized client pool in ${Date.now() - startTime}ms at node ${url} with ${
				node.clientPool.length
			} instances.`,
		);
	} catch (err) {
		logger.warn(
			node.clientPool.length
				? `API client pool initialization on ${url} failed due to: ${err.message}\nManaged to initialize the pool with only ${node.clientPool.length} instead of expected ${poolSize} clients.`
				: `API client pool initialization on ${url} failed due to: ${err.message}`,
		);
		throw err;
	}
};

const waitForGetApiClient = (url, intervalMs = 1000, resolveUndefined = false) =>
	// eslint-disable-next-line implicit-arrow-linebreak
	new Promise(resolve => {
		// eslint-disable-next-line consistent-return
		const timeout = setInterval(async () => {
			try {
				const result = await getApiClient(url);
				if (resolveUndefined || result !== undefined) {
					clearInterval(timeout);
					return resolve(result);
				}
			} catch (err) {
				logger.debug(`Waiting ${intervalMs}...`);
			}
		}, intervalMs);
	});

const getApiClient = async (url, poolIndex) => {
	await initNodeClientPoolIfEmpty();
	const node = await getNodeClient(url);

	const index = Number.isNaN(Number(poolIndex))
		? crypto.randomInt(Math.min(node.clientPool.length, MAX_CLIENT_POOL_SIZE))
		: poolIndex;

	const apiClient = node.clientPool[index];
	return checkIsClientAlive(apiClient)
		? apiClient
		: (async () => {
				if (apiClient) {
					Signals.get('resetApiClient').dispatch(apiClient);
					logger.debug(
						`Dispatched 'resetApiClient' signal from getApiClient for API client ${apiClient.poolIndex} at ${apiClient.url}.`,
					);
				}

				const intervalMs = Math.ceil(WS_SERVER_PING_INTERVAL / MAX_CLIENT_POOL_SIZE);

				if ((await getNodeClientActiveSize(node)) === 0) {
					const healthyNode = await getLeastLoadedNode();
					return waitForGetApiClient(healthyNode.url, intervalMs);
				}

				return waitForGetApiClient(url, intervalMs);
		  })();
};

const resetApiClient = async (apiClient, isEventSubscriptionClient = false) => {
	// Replace the dead API client in the pool
	if (!isObject(apiClient)) {
		logger.warn(`apiClient is ${JSON.stringify(apiClient)}. Cannot reset.`);
		if (isEventSubscriptionClient) Signals.get('eventSubscriptionClientReset').dispatch();
		return;
	}

	const { url, poolIndex } = apiClient;

	// Do not attempt reset if last ping was within the acceptable threshold
	// This is to avoid unnecessary socket creation
	if (Date.now() - (apiClient.lastPingAt || 0) < WS_SERVER_PING_THRESHOLD) {
		logger.debug(
			`Not resetting apiClient ${poolIndex} at ${url}. Received a late ping from the server.`,
		);
		return;
	}

	if (isEventSubscriptionClient) {
		logger.info(
			`Attempting to reset the eventSubscriptionClient: apiClient ${poolIndex} at ${url}.`,
		);
		Signals.get('eventSubscriptionClientReset').dispatch();
	} else {
		logger.info(`Attempting to reset apiClient ${poolIndex} at ${url}.`);
	}

	await apiClient
		.disconnect()
		.catch(err =>
			logger.warn(
				`Error disconnecting apiClient ${poolIndex} at ${url}: ${err.message}. Will proceed.`,
			),
		);

	const newApiClient = await instantiateNewClient(url)
		.then(client => {
			client.url = url;
			client.poolIndex = poolIndex;
			logger.info(`Successfully reset apiClient ${poolIndex} at ${url}.`);
			return client;
		})
		.catch(() => null);

	const node = await getNodeClient(url);
	node.clientPool[poolIndex] = newApiClient;

	if (node.isDedicatedEventSubscriber === true && newApiClient) {
		Signals.get('newApiClient').dispatch(newApiClient.url, newApiClient.poolIndex);
	}
};
Signals.get('resetApiClient').add(resetApiClient);

const is2XXResponse = response => String(response.status).startsWith('2');
const isSuccessResponse = response => is2XXResponse(response) && response.data.result;

const buildHTTPResponse = (endpoint, params, response) => {
	if (isSuccessResponse(response)) return response.data.result;

	const errorMessage =
		response.data && response.data.error
			? response.data.error.message
			: `${response.status}: ${response.message}`;
	logger.trace(
		`Error invoking endpoint '${endpoint}' with params ${JSON.stringify(params)}:\n${errorMessage}`,
	);
	throw new Error(errorMessage);
};

const invokeEndpointWrapped = async (
	node,
	endpoint,
	params = {},
	numRetries = NUM_REQUEST_RETRIES,
	// eslint-disable-next-line consistent-return
) => {
	let retriesLeft = numRetries;

	do {
		try {
			node.numEndpointInvocations++;

			if (node.url.startsWith('http')) {
				// HTTP API-based communication with the Klayr app node
				const rpcRequest = {
					jsonrpc: '2.0',
					id: node.numEndpointInvocations,
					method: endpoint,
					params,
				};

				const response = await HTTP.post(`${node.url}/rpc`, rpcRequest);
				return buildHTTPResponse(endpoint, params, response);
			}

			// WS and IPC client-based communication with the Klayr app node
			const apiClient = await getApiClient(node.url);
			const response = await apiClient._channel.invoke(endpoint, params);
			return response;
		} catch (err) {
			if (TIMEOUT_REGEX.test(err.message)) {
				if (!retriesLeft) {
					const exceptionMsg = Object.getOwnPropertyNames(params).length
						? `Invocation timed out for '${endpoint}' at ${node.url} with params:\n${JSON.stringify(
								params,
						  )}.`
						: `Invocation timed out for '${endpoint}' at ${node.url}.`;

					throw new TimeoutException(exceptionMsg);
				}
				await delay(ENDPOINT_INVOKE_RETRY_DELAY);
			} else {
				logger.warn(
					Object.getOwnPropertyNames(params).length
						? `Error invoking '${endpoint}' at ${node.url} with params:\n${JSON.stringify(
								params,
						  )}.\n${err.stack}`
						: `Error invoking '${endpoint}' at ${node.url}.\n${err.stack}`,
				);

				throw err;
			}
		}
	} while (retriesLeft--);
};

const invokeEndpoint = async (endpoint, params = {}, numRetries = NUM_REQUEST_RETRIES) => {
	const invokeEndpointCall = async () => {
		const node = await getLeastLoadedNode();
		logger.trace(`invokeEndpoint ${endpoint} dispatching to ${node.url}`);

		if (config.queue.invokeEndpoint.concurrency > 0) {
			return await node.queue.add(() => invokeEndpointWrapped(node, endpoint, params, numRetries));
		} else {
			return await invokeEndpointWrapped(node, endpoint, params, numRetries);
		}
	};

	const coalescer = getCoalescerInstance();
	return await coalescer.coalesce(invokeEndpointCall, endpoint, params);
};

const invokeEndpointImmediate = async (endpoint, params = {}, numRetries = NUM_REQUEST_RETRIES) => {
	const invokeEndpointCall = async () => {
		const node = await getLeastLoadedNode();
		logger.trace(`invokeEndpointImmediate ${endpoint} dispatching to ${node.url}`);
		return await invokeEndpointWrapped(node, endpoint, params, numRetries);
	};

	const coalescer = getCoalescerInstance();
	return await coalescer.coalesce(invokeEndpointCall, endpoint, params);
};

const invokeEndpointOnSpecificNode = async (
	url,
	endpoint,
	params = {},
	numRetries = NUM_REQUEST_RETRIES,
) => {
	const node = await getNodeClient(url);
	logger.trace(`invokeEndpointOnSpecificNode ${endpoint} dispatching to ${node.url}`);

	const invokeEndpointCall = async () => {
		if (config.queue.invokeEndpoint.concurrency > 0) {
			return await node.queue.add(() => invokeEndpointWrapped(node, endpoint, params, numRetries));
		} else {
			return await invokeEndpointWrapped(node, endpoint, params, numRetries);
		}
	};

	const coalescer = getCoalescerInstance();
	return await coalescer.coalesce(invokeEndpointCall, node.url, endpoint, params);
};

module.exports = {
	TIMEOUT_REGEX,

	getApiClient,
	invokeEndpoint,
	getEventSubscriberNodeURL,
	invokeEndpointOnSpecificNode,
	invokeEndpointImmediate,
};
