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
const {
	Exceptions: { InvalidParamsException },
} = require('klayr-service-framework');
const { getAvailableBalance } = require('../../recorder/token/balances');
const { getLockedBalance } = require('../../recorder/token/locked');

const getTokenBalances = async params => {
	const tokensInfo = [];
	const tokens = {
		data: [],
		meta: {},
	};

	if (params.tokenID && !params.address) {
		throw new InvalidParamsException(
			'TokenID based retrieval is only possible along with address.',
		);
	}

	const response = await getAvailableBalance(params.address, params.tokenID);
	for (let i = 0; i < response.length; i++) {
		const balanceInfo = response[i];
		const lockedBalance = await getLockedBalance(balanceInfo.address, balanceInfo.tokenID);

		const data = {
			tokenID: params.tokenID,
			availableBalance: balanceInfo.availableBalance,
			lockedBalance: lockedBalance.filter(t => t.amount !== '0'),
		};

		tokensInfo.push(data);
	}

	tokens.data =
		'offset' in params && 'limit' in params
			? tokensInfo.slice(params.offset, params.offset + params.limit)
			: tokensInfo;

	tokens.meta = {
		address: params.address,
		count: tokens.data.length,
		offset: params.offset,
		total: tokensInfo.length,
	};

	return tokens;
};

module.exports = {
	getTokenBalances,
};
