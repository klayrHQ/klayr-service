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
	tableName: 'validators',
	primaryKey: 'address',
	schema: {
		address: { type: 'string', length: 41 },
		name: { type: 'string', length: 20 },
		blsKey: { type: 'string', length: 96, null: true },
		proofOfPossession: { type: 'string', length: 192, null: true },
		generatorKey: { type: 'string', length: 64, null: true },
		generatedBlocks: { type: 'integer', null: false, defaultValue: 0 },
		totalCommission: { type: 'bigInteger', null: false, defaultValue: 0 },
		totalSelfStakeRewards: { type: 'bigInteger', null: false, defaultValue: 0 },
		reportMisbehaviorHeights: { type: 'json', null: false, defaultValue: [] },
	},
	indexes: {
		name: { type: 'key' },
		generatorKey: { type: 'key' },
		blsKey: { type: 'key' },
	},
	purge: {},
};
