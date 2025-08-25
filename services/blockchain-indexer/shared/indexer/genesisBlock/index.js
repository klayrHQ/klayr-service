/*
 * Klayrhq/klayrservice
 * Copyright © 2023 Lisk Foundation
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
const { Logger } = require('klayr-service-framework');

const { triggerAccountUpdates } = require('../accountIndex');
const { indexTokenModuleAssets } = require('./token');
const { indexPosModuleAssets } = require('./pos');
const { indexAuthModuleAssets } = require('./auth');
const { indexValidatorModuleGenesisEvents } = require('./validator');

const logger = Logger();

let genesisAssetIntervalTimeout;
let genesisEventsIntervalTimeout;

const getGenesisAssetIntervalTimeout = () => genesisAssetIntervalTimeout;
const getGenesisEventsIntervalTimeout = () => genesisEventsIntervalTimeout;

const indexGenesisBlockAssets = async dbTrx => {
	clearTimeout(genesisAssetIntervalTimeout);
	logger.info('Starting to index the genesis assets.');

	genesisAssetIntervalTimeout = setInterval(
		() => logger.info('Genesis assets indexing still in progress...'),
		5000,
	);

	await indexTokenModuleAssets(dbTrx);
	await indexPosModuleAssets(dbTrx);
	await indexAuthModuleAssets(dbTrx);

	await triggerAccountUpdates();
	clearInterval(genesisAssetIntervalTimeout);
	logger.info('Finished indexing all the genesis assets.');
};

const indexGenesisBlockEvents = async (events, _dbTrx) => {
	clearTimeout(genesisEventsIntervalTimeout);
	logger.info('Starting to index the genesis events.');

	genesisEventsIntervalTimeout = setInterval(
		() => logger.info('Genesis events indexing still in progress...'),
		5000,
	);

	await indexValidatorModuleGenesisEvents(events);

	clearInterval(genesisEventsIntervalTimeout);
	logger.info('Finished indexing all the genesis events.');
};

module.exports = {
	getGenesisAssetIntervalTimeout,
	getGenesisEventsIntervalTimeout,
	indexGenesisBlockAssets,
	indexGenesisBlockEvents,

	// For testing
	indexTokenModuleAssets,
	indexPosModuleAssets,
};
