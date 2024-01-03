/*
 * LiskHQ/lisk-service
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
} = require('lisk-service-framework');
const { createWSClient, createIPCClient } = require('@liskhq/lisk-api-client');

const config = require('../../config');
const delay = require('../utils/delay');

const logger = Logger();

// Constants
const timeoutMessage = 'Response not received in';
const liskAddressWs = config.endpoints.liskWs;
const liskAddressHttp = config.endpoints.liskHttp;
const NUM_REQUEST_RETRIES = config.apiClient.request.maxRetries;
const ENDPOINT_INVOKE_RETRY_DELAY = config.apiClient.request.retryDelay;
const CLIENT_ALIVE_ASSUMPTION_TIME = config.apiClient.aliveAssumptionTime;
const HEARTBEAT_ACK_MAX_WAIT_TIME = config.apiClient.heartbeatAckMaxWaitTime;
const CONNECTION_LIMIT = config.apiClient.connectionLimit;

// Pool of cached API clients
const cachedApiClients = [];

const checkIsClientAlive = async clientCache =>
	// eslint-disable-next-line consistent-return
	new Promise(resolve => {
		if (!clientCache || !clientCache._channel || !clientCache._channel.isAlive) {
			return resolve(false);
		}

		// Skip heartbeat check for IPC client
		if (config.isUseLiskIPCClient) {
			return resolve(true);
		}

		const heartbeatCheckBeginTime = Date.now();
		const wsInstance = clientCache._channel._ws;

		// eslint-disable-next-line no-use-before-define
		const boundPongListener = () => pongListener(resolve);
		wsInstance.on('pong', boundPongListener);
		wsInstance.ping(() => {});

		// eslint-disable-next-line consistent-return
		const timeout = setTimeout(() => {
			wsInstance.removeListener('pong', boundPongListener);
			logger.debug(
				`Did not receive API client pong after ${Date.now() - heartbeatCheckBeginTime}ms.`,
			);
			return resolve(false);
		}, HEARTBEAT_ACK_MAX_WAIT_TIME);

		const pongListener = res => {
			clearTimeout(timeout);
			wsInstance.removeListener('pong', boundPongListener);
			logger.debug(`Received API client pong in ${Date.now() - heartbeatCheckBeginTime}ms.`);
			return res(true);
		};
	}).catch(() => false);

const instantiateAndCacheClient = async () => {
	if (cachedApiClients.length > CONNECTION_LIMIT) {
		logger.debug(
			`Skipping API client instantiation as cached API client count(${cachedApiClients.length}) is greater than CONNECTION_LIMIT(${CONNECTION_LIMIT}).`,
		);
		return;
	}

	try {
		const instantiationBeginTime = Date.now();
		const clientCache = config.isUseLiskIPCClient
			? await createIPCClient(config.liskAppDataPath)
			: await createWSClient(`${liskAddressWs}/rpc-ws`);

		cachedApiClients.push(clientCache);

		logger.info(
			`Instantiated another API client. Time taken: ${
				Date.now() - instantiationBeginTime
			}ms. Cached API client count:${cachedApiClients.length}`,
		);
	} catch (err) {
		// Nullify the apiClient cache and unset isInstantiating, so that it can be re-instantiated properly
		const errMessage = config.isUseLiskIPCClient
			? `Error instantiating IPC client at ${config.liskAppDataPath}.`
			: `Error instantiating WS client to ${liskAddressWs}.`;

		logger.error(errMessage);
		logger.error(err.message);
		if (err.message.includes('ECONNREFUSED')) {
			throw new Error('ECONNREFUSED: Unable to reach a network node.');
		}
	}
};

const getApiClient = async () => {
	if (cachedApiClients.length === 0) {
		await instantiateAndCacheClient();
	}
	return cachedApiClients[0];
};

const isResponse2XX = response => String(response.status).startsWith('2');

let id = -1;
// eslint-disable-next-line consistent-return
const invokeEndpoint = async (endpoint, params = {}, numRetries = NUM_REQUEST_RETRIES) => {
	let retriesLeft = numRetries;
	do {
		id++;
		try {
			if (config.isUseHttpApi) {
				const rpcRequest = {
					jsonrpc: '2.0',
					id,
					method: endpoint,
					params,
				};

				const response = await HTTP.post(`${liskAddressHttp}/rpc`, rpcRequest);
				return isResponse2XX(response)
					? response.data.result
					: (() => {
							logger.trace(
								`Error when invoking endpoint ${endpoint} with params ${JSON.stringify(params)}: ${
									response.data.error.message
								}`,
							);
							throw new Error(response.data.error);
					  })();
			}
			const apiClient = await getApiClient();
			const response = await apiClient._channel.invoke(endpoint, params);
			return response;
		} catch (err) {
			if (err.message.includes(timeoutMessage)) {
				if (!retriesLeft) {
					const exceptionMsg = Object.getOwnPropertyNames(params).length
						? `Request timed out when calling '${endpoint}' with params:\n${JSON.stringify(
								params,
								null,
								'\t',
						  )}.`
						: `Request timed out when calling '${endpoint}'.`;

					throw new TimeoutException(exceptionMsg);
				}
				await delay(ENDPOINT_INVOKE_RETRY_DELAY);
			} else {
				if (Object.getOwnPropertyNames(params).length) {
					logger.warn(
						`Error invoking '${endpoint}' with params:\n${JSON.stringify(params, null, ' ')}.\n${
							err.stack
						}`,
					);
				}

				logger.warn(`Error occurred when calling '${endpoint}' :\n${err.stack}`);
				throw err;
			}
		}
	} while (retriesLeft--);
};

const disconnectClient = async cachedClient => {
	try {
		await cachedClient.disconnect();
	} catch (err) {
		logger.warn(`Client disconnection failed due to: ${err.message}`);
	}
};

const refreshClientsCache = async () => {
	// Indicates if an active client was destroyed or no active clients available
	let activeClientNotAvailable = cachedApiClients.length === 0;

	// Check liveliness and remove non-responsive clients
	let index = 0;
	while (index < cachedApiClients.length) {
		const cachedClient = cachedApiClients[index];
		try {
			if (!(await checkIsClientAlive(cachedClient))) {
				cachedApiClients.splice(index, 1);
				if (index === 0) {
					activeClientNotAvailable = true;
				}
				await disconnectClient(cachedClient);
			} else {
				index++;
			}
		} catch (err) {
			logger.info(`Failed to refresh an active API client from cache.\nError:${err.message}`);
		}
	}

	// Initiate new clients if necessary
	let missingClientCount = CONNECTION_LIMIT - cachedApiClients.length;

	while (missingClientCount-- > 0) {
		try {
			await instantiateAndCacheClient();
		} catch (err) {
			logger.warn(`Failed to instantiate new API client.\nError: ${err.message}`);
		}
	}

	// Reset event listeners if active API client was destroyed
	if (activeClientNotAvailable && cachedApiClients.length > 0) {
		Signals.get('newApiClient').dispatch();
	}

	return cachedApiClients.length;
};

// Listen to client unresponsive events and try to reinitialize client
const resetApiClientListener = async () => {
	logger.info(
		`Received API client reset signal. Will drop ${cachedApiClients.length} cached API client(s).`,
	);
	// Drop pool of cached clients. Will be instantiated by refresh clients job
	while (cachedApiClients.length > 0) {
		const cachedClient = cachedApiClients.pop();
		await disconnectClient(cachedClient);
	}
};
Signals.get('resetApiClient').add(resetApiClientListener);

// Check periodically for client aliveness and refill cached clients pool
(async () => {
	if (config.isUseHttpApi) return;

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const cacheRefreshStartTime = Date.now();
		await refreshClientsCache();
		logger.debug(
			`Refreshed API client cache in ${Date.now() - cacheRefreshStartTime}ms. There are ${
				cachedApiClients.length
			} API client(s) in the pool.`,
		);
		await delay(CLIENT_ALIVE_ASSUMPTION_TIME);
	}
})();

module.exports = {
	timeoutMessage,

	getApiClient,
	invokeEndpoint,
};
