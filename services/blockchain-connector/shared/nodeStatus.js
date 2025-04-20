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
const { Logger, Signals } = require('klayr-service-framework');
const config = require('../config');
const { invokeEndpointOnSpecificNode } = require('./sdk/client');

const logger = Logger();

const NODE_DISCOVERY_INTERVAL = 1 * 1000; // ms
const NODE_SYNC_CHECK_INTERVAL = 15 * 1000; // in ms

let intervalID;

const getSpecificNodeInfo = async url => invokeEndpointOnSpecificNode(url, 'system_getNodeInfo');

const checkStatus = url =>
	new Promise((resolve, reject) =>
		// eslint-disable-next-line no-promise-executor-return
		getSpecificNodeInfo(url)
			.then(nodeInfo => {
				resolve(nodeInfo);
			})
			.catch(() => {
				logger.debug(`The node ${url} not available at the moment.`);
				reject();
			}),
	);

const waitForSpecificNode = async url =>
	new Promise(resolve => {
		// eslint-disable-next-line consistent-return
		const timeout = setInterval(async () => {
			try {
				const result = await checkStatus(url);
				clearInterval(timeout);
				return resolve(result);
			} catch (err) {
				logger.debug(`Waiting ${NODE_DISCOVERY_INTERVAL}...`);
			}
		}, NODE_DISCOVERY_INTERVAL);
	});

const waitForNode = async () => {
	// waiting for all node in config.endpoints.klayrUrls
	for (let index = 0; index < config.endpoints.klayrUrls.length; index++) {
		await waitForSpecificNode(config.endpoints.klayrUrls[index]);
	}
};

const waitForNodeToFinishSync = () =>
	new Promise(resolve => {
		// Clear any previous interval
		if (intervalID) {
			clearInterval(intervalID);
			intervalID = null;
		}

		// Our check function
		// eslint-disable-next-line consistent-return
		const checkAll = async () => {
			try {
				// 1. Fetch each node's status in parallel
				const infos = await Promise.all(
					config.endpoints.klayrUrls.map(async url => getSpecificNodeInfo(url)),
				);

				// 2. See if any are still syncing
				const stillSyncing = infos
					.map((info, i) => ({ url: config.endpoints.klayrUrls[i], syncing: info.syncing }))
					.filter(x => x.syncing);

				if (stillSyncing.length === 0) {
					// 🚀 All done!
					logger.info('All nodes are fully synchronized with the network.');
					Signals.get('nodeIsSynced').dispatch();
					clearInterval(intervalID);
					return resolve(true);
				}

				// 🔄 Otherwise log and wait for next poll
				const urls = stillSyncing.map(x => x.url).join(', ');
				logger.info(`Waiting on ${stillSyncing.length}/${infos.length} nodes to sync: ${urls}`);
			} catch (err) {
				// you might want to handle per‑node errors differently
				logger.warn('Error while checking node sync status:', err);
			}
		};

		// 3. Kick off the first check immediately ...
		checkAll();

		// 4. ... then every NODE_SYNC_CHECK_INTERVAL ms
		intervalID = setInterval(checkAll, NODE_SYNC_CHECK_INTERVAL);
	});

module.exports = {
	waitForNode,
	waitForNodeToFinishSync,
};
