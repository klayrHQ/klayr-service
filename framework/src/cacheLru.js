/*
 * Klayrhq/klayrservice
 * Copyright © 2020 Lisk Foundation
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
const { KeyvLru, KeyvLruManagedTtl } = require('keyv-lru');

const memoryPool = {};

const keyvMemoryCache = (bank = '$default', options = {}) => {
	if (!memoryPool[bank]) {
		if (options.ttl) {
			memoryPool[bank] = new KeyvLruManagedTtl({
				max: options.max || 1000,
				ttl: options.ttl || 0,
				notify: false,
				expire: 0,
			});
		} else {
			memoryPool[bank] = new KeyvLru({
				max: options.max || 1000,
				ttl: options.ttl || 0,
				notify: false,
				expire: 0,
			});
		}
	}

	const cache = memoryPool[bank];

	return {
		set: (key, val, ttl) => cache.set(key, val, ttl),
		get: key => cache.get(key),
		delete: key => cache.delete(key),
		destroy: () => cache.clear(),
	};
};

module.exports = keyvMemoryCache;
