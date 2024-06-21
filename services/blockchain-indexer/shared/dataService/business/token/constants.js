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
const { requestConnector } = require('../../../utils/request');

let moduleConstants = {};

const getTokenConstants = async () => {
	if (!Object.getOwnPropertyNames(moduleConstants).length) {
		const initializationFees = await requestConnector('getTokenInitializationFees');
		moduleConstants = {
			extraCommandFees: {
				userAccountInitializationFee: initializationFees.userAccount,
				escrowAccountInitializationFee: initializationFees.escrowAccount,
			},
		};
	}

	return {
		data: moduleConstants,
		meta: {},
	};
};

module.exports = {
	getTokenConstants,
};
