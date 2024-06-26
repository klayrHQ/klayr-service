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
const business = require('./business');

const getSchemas = async () => {
	const schemas = {
		data: {},
		meta: {},
	};

	const response = await business.getSchemas();
	if (response.data) schemas.data = response.data;
	if (response.meta) schemas.meta = response.meta;

	return schemas;
};

module.exports = {
	getSchemas,
};
