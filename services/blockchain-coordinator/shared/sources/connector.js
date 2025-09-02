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
	waitForConnectorWorkloadReady,
	waitForConnectorReady,
	waitForConnectorStatusReady,
} = require('../connectorReady');
const { requestConnector } = require('../utils/request');

const waitForConnector = async () => {
	await waitForConnectorReady();
	await waitForConnectorStatusReady();
	await waitForConnectorWorkloadReady();
};

const getAllPosValidators = async () => {
	await waitForConnector();
	return await requestConnector('getAllPosValidators');
};

const getBlocksByHeightBetween = async (from, to) => {
	await waitForConnector();
	return await requestConnector('getBlocksByHeightBetween', { from, to });
};

module.exports = {
	getAllPosValidators,
	getBlocksByHeightBetween,
};
