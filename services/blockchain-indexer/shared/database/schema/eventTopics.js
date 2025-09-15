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
	tableName: 'event_topics',
	primaryKey: ['eventPK', 'topic'],
	schema: {
		eventPK: { type: 'bigInteger' },
		topic: { type: 'string', length: 100 },
		module: { type: 'string', length: 32 },
		name: { type: 'string', length: 64 },
		height: { type: 'integer' },
		timestamp: { type: 'integer' },
		index: { type: 'integer' },
	},
	indexes: {},
	compositeIndexes: {
		topic_only_sort: [
			{ key: 'topic' },
			{ key: 'timestamp', direction: 'DESC' },
			{ key: 'index', direction: 'ASC' },
			{ key: 'eventPK' },
		],
		topic_combination_sort: [
			{ key: 'topic' },
			{ key: 'module' },
			{ key: 'name' },
			{ key: 'height' },
			{ key: 'timestamp', direction: 'DESC' },
			{ key: 'index', direction: 'ASC' },
			{ key: 'eventPK' },
		],
	},
	purge: {},
};
