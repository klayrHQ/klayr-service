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
	tableName: 'transactions',
	primaryKey: 'id',
	charset: 'utf8mb4',
	schema: {
		id: { type: 'string', length: 64, null: false },
		height: { type: 'integer', null: false },
		moduleCommand: { type: 'string', length: 96, null: false },
		nonce: { type: 'integer', null: false },
		blockID: { type: 'string', length: 64, null: false },
		timestamp: { type: 'integer', null: false },
		senderAddress: { type: 'string', length: 41, null: false },
		recipientAddress: { type: 'string', length: 41, null: true, defaultValue: null },
		tokenID: { type: 'string', length: 16, null: true, defaultValue: null },
		amount: { type: 'bigInteger', null: true, defaultValue: null },
		receivingChainID: { type: 'string', length: 8, null: true, defaultValue: null },
		messageFee: { type: 'bigInteger', null: true, defaultValue: null },
		data: { type: 'string', length: 64, null: true, defaultValue: null },
		size: { type: 'integer', null: false },
		fee: { type: 'bigInteger', null: false },
		minFee: { type: 'bigInteger', null: false },
		executionStatus: { type: 'string', length: 16, null: false },
		index: { type: 'integer', null: false },

		// Retrieved Directly From Block Header:
		senderPublicKey: { type: 'string', length: 64, null: false },
		signatures: { type: 'json', null: false },
		params: { type: 'json', null: false },
	},
	indexes: {
		height: { type: 'range' },
		moduleCommand: { type: 'key' },
		nonce: { type: 'range' },
		blockID: { type: 'key' },
		timestamp: { type: 'range' },
		amount: { type: 'range' },
		data: { type: 'key' },
		senderAddress: { type: 'key' },
		receivingChainID: { type: 'key' },
		executionStatus: { type: 'key' },
	},
	compositeIndexes: {
		// TODO: implement composite index
	},
	purge: {},
};
