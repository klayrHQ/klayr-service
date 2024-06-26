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
const packageJson = require('../../package.json');
const { getMarketPrices } = require('./market');

const status = {
	service: packageJson.name,
	version: packageJson.version,
	isReady: false,
};

const getStatus = async () => {
	if (!status.isReady) {
		const marketPrices = await getMarketPrices();
		status.isReady = !!marketPrices.data.length;
	}
	return status;
};

module.exports = {
	getStatus,
};
