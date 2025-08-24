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

const logger = Logger();

let intervalTimeout;

const getGenesisAssetIntervalTimeout = () => intervalTimeout;

const indexGenesisBlockAssets = async dbTrx => {
	clearTimeout(intervalTimeout);
	logger.info('Starting to index the genesis assets.');

	intervalTimeout = setInterval(
		() => logger.info('Genesis assets indexing still in progress...'),
		5000,
	);

	await indexTokenModuleAssets(dbTrx);
	await indexPosModuleAssets(dbTrx);
	await indexAuthModuleAssets(dbTrx);

	await triggerAccountUpdates();
	clearInterval(intervalTimeout);
	logger.info('Finished indexing all the genesis assets.');
};

module.exports = {
	getGenesisAssetIntervalTimeout,
	indexGenesisBlockAssets,

	// For testing
	indexTokenModuleAssets,
	indexPosModuleAssets,
};
