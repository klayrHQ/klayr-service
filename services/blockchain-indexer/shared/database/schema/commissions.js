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
	tableName: 'commissions',
	primaryKey: ['address', 'height'],
	schema: {
		address: { type: 'string', length: 41, null: false },
		commission: { type: 'string', length: 12, null: false },
		height: { type: 'string', length: 12, null: false },
	},
	indexes: {
		commission: { type: 'range' },
	},
	purge: {},
};
