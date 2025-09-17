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
const { CacheRedis } = require('klayr-service-framework');

const config = require('../../../config');

const validatorCache = CacheRedis('validator', config.endpoints.cache);

const getAddressByName = async name => {
	if (name) {
		const address = await validatorCache.get(name);
		if (address) return address;
	}
	return null;
};

const getNameByAddress = async address => {
	if (address) {
		const name = await validatorCache.get(address);
		if (name) return name;
	}
	return null;
};

module.exports = {
	getAddressByName,
	getNameByAddress,
};
