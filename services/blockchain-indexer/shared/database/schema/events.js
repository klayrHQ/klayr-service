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
	tableName: 'events',
	primaryKey: 'eventPK',
	schema: {
		eventPK: { type: 'bigInteger' },
		id: { type: 'string', length: 64 }, // Unique event identifier
		module: { type: 'string', length: 32 },
		name: { type: 'string', length: 64 }, // Type of event
		blockID: { type: 'string', length: 64 },
		data: { type: 'json' },
		index: { type: 'integer' },
		topics: { type: 'json' }, // Type of event
		height: { type: 'integer' },
		timestamp: { type: 'integer' },
	},
	indexes: {},
	compositeIndexes: {
		generic_sort: [
			{ key: 'timestamp', direction: 'DESC' },
			{ key: 'index', direction: 'ASC' },
		],
		height_sort: [
			{ key: 'height' },
			{ key: 'timestamp', direction: 'DESC' },
			{ key: 'index', direction: 'ASC' },
		],
	},
	purge: {},
};
