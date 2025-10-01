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
module.exports = {
	tableName: 'blockchain_apps',
	primaryKey: 'chainID',
	schema: {
		chainID: { type: 'string', length: 8 },
		chainName: { type: 'string', length: 32 },
		status: { type: 'string', length: 16 },
		address: { type: 'string', length: 41 },
		lastUpdated: { type: 'string', length: 12 },
		lastCertificateHeight: { type: 'string', length: 12 },
	},
	indexes: {
		status: { type: 'key' },
		chainName: { type: 'key' },
	},
	purge: {},
};
