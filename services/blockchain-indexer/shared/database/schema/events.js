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
		data: { type: 'json' },
		index: { type: 'integer' },
		module: { type: 'string' },
		name: { type: 'string' }, // Type of event
		topics: { type: 'json' }, // Type of event
		height: { type: 'integer' },
		id: { type: 'string' }, // Unique event identifier
		blockID: { type: 'string' },
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
