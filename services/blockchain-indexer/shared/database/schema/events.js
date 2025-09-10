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
	indexes: {
		eventPK: { type: 'key' },
		index: { type: 'range' },
		module: { type: 'key' },
		name: { type: 'key' },
		height: { type: 'range' },
		timestamp: { type: 'range' },
	},
	compositeIndexes: {
		timestamp_desc_index_asc: [
			{ key: 'timestamp', direction: 'DESC' },
			{ key: 'index', direction: 'ASC' },
		],
		timestamp_asc_index_asc: [
			{ key: 'timestamp', direction: 'ASC' },
			{ key: 'index', direction: 'ASC' },
		],
		timestamp_desc_index_desc: [
			{ key: 'timestamp', direction: 'DESC' },
			{ key: 'index', direction: 'DESC' },
		],
		timestamp_asc_index_desc: [
			{ key: 'timestamp', direction: 'ASC' },
			{ key: 'index', direction: 'DESC' },
		],
		height_desc_index_asc: [
			{ key: 'height', direction: 'DESC' },
			{ key: 'index', direction: 'ASC' },
		],
		height_asc_index_asc: [
			{ key: 'height', direction: 'ASC' },
			{ key: 'index', direction: 'ASC' },
		],
		height_desc_index_desc: [
			{ key: 'height', direction: 'DESC' },
			{ key: 'index', direction: 'DESC' },
		],
		height_asc_index_desc: [
			{ key: 'height', direction: 'ASC' },
			{ key: 'index', direction: 'DESC' },
		],
	},
	purge: {},
};
