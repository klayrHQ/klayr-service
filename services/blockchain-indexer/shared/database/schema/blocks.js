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
	tableName: 'blocks',
	primaryKey: 'height',
	schema: {
		id: { type: 'string', length: 64 },
		height: { type: 'integer' },
		timestamp: { type: 'integer' },
		generatorAddress: { type: 'string', length: 41 },
		size: { type: 'integer' },
		isFinal: { type: 'boolean', defaultValue: false },
		assetsModules: { type: 'json' },
		numberOfEvents: { type: 'integer', defaultValue: 0 },
		reward: { type: 'bigInteger', defaultValue: BigInt('0') },

		// Retrieved Directly From Block Header:
		version: { type: 'integer' },
		previousBlockID: { type: 'string', length: 64 },
		stateRoot: { type: 'string', length: 64 },
		assetRoot: { type: 'string', length: 64 },
		eventRoot: { type: 'string', length: 64 },
		transactionRoot: { type: 'string', length: 64 },
		validatorsHash: { type: 'string', length: 64 },
		aggregateCommit: { type: 'json' },
		maxHeightPrevoted: { type: 'integer' },
		maxHeightGenerated: { type: 'integer' },
		impliesMaxPrevotes: { type: 'boolean' },
		signature: { type: 'string', length: 128 },
		assets: { type: 'json' },

		// Additional Metadata:
		generator: { type: 'json' },
		networkFee: { type: 'bigInteger', defaultValue: BigInt('0') },
		totalBurnt: { type: 'bigInteger', defaultValue: BigInt('0') },
		totalForged: { type: 'bigInteger', defaultValue: BigInt('0') },
		numberOfAssets: { type: 'integer', defaultValue: 0 },
		numberOfTransactions: { type: 'integer', defaultValue: 0 },
	},
	indexes: {
		id: { type: 'key' },
		timestamp: { type: 'range' },
		generatorAddress: { type: 'key' },
		size: { type: 'range' },
		isFinal: { type: 'key' },
	},
	compositeIndexes: {
		// TODO: implement composite index
	},
	purge: {},
};
