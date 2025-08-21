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
	LENGTH_CHAIN_ID,
	PATTERN_ANY_TOKEN_ID,
	PATTERN_ANY_CHAIN_TOKEN_ID,
} = require('../../../constants');
const { getTokenSupply } = require('../../../indexer/tokenIndex/shared/supply');
const { getTokenEscrowed } = require('../../../indexer/tokenIndex/shared/escrowed');
const { getSupportedTokens } = require('../../../indexer/tokenIndex/shared/supported');

const getTokenSummary = async () => {
	const summary = {
		data: {},
		meta: {},
	};

	const escrowedAmounts = await getTokenEscrowed();
	const supportedTokenIDs = await getSupportedTokens();

	const totalSupply = await getTokenSupply();

	const supportedTokens = {
		isSupportAllTokens: false,
		exactTokenIDs: [],
		patternTokenIDs: [],
	};

	for (let i = 0; i < supportedTokenIDs.length; i++) {
		const tokenID = supportedTokenIDs[i];
		if (tokenID === PATTERN_ANY_TOKEN_ID) {
			supportedTokens.isSupportAllTokens = true;
		} else if (tokenID.substring(LENGTH_CHAIN_ID) === PATTERN_ANY_CHAIN_TOKEN_ID) {
			supportedTokens.patternTokenIDs.push(tokenID);
		} else {
			supportedTokens.exactTokenIDs.push(tokenID);
		}
	}

	summary.data = {
		escrowedAmounts,
		supportedTokens: {
			...supportedTokens,
			exactTokenIDs: [...new Set(supportedTokens.exactTokenIDs)],
			patternTokenIDs: [...new Set(supportedTokens.patternTokenIDs)],
		},
		totalSupply,
	};

	return summary;
};

module.exports = {
	getTokenSummary,
};
