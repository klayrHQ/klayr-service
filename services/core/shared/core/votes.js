/*
 * LiskHQ/lisk-service
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
const coreApi = require('./compat');

const getVotes = async params => {
	const votes = {
		data: [],
		meta: {},
	};

	const response = await coreApi.getVotes(params);

	votes.data = response.data.votes;
	votes.meta = {
		limit: response.meta.limit,
		count: response.data.votes.length,
		offset: response.meta.offset,
		total: response.data.votesUsed,
		address: response.data.address,
		publicKey: response.data.publicKey,
		username: response.data.username,
	};

	return votes;
};

module.exports = {
	getVotes,
};
