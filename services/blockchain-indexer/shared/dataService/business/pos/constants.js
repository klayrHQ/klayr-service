/*
 * Klayrhq/klayrservice
 * Copyright © 2021 Lisk Foundation
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
const { Logger } = require('klayr-service-framework');
const { requestConnector } = require('../../../utils/request');

const logger = Logger();

let posModuleConstants;

const getPosConstants = async () => {
	try {
		if (typeof posModuleConstants === 'undefined')
			posModuleConstants = await requestConnector('getPosConstants');
	} catch (err) {
		const errMessage = `Unable to fetch the PoS constants from connector due to: ${err.message}`;
		logger.warn(errMessage);
		logger.trace(err.stack);
		throw new Error(errMessage);
	}

	return {
		data: posModuleConstants,
		meta: {},
	};
};

const getPosTokenID = async () => {
	const {
		data: { posTokenID },
	} = await getPosConstants();
	return posTokenID;
};

const getPosPunishmentLockingPeriods = async () => {
	const { data } = await getPosConstants();
	const punishmentLockingPeriods = {
		punishmentWindowStaking: data.punishmentWindowStaking,
		punishmentWindowSelfStaking: data.punishmentWindowSelfStaking,
		lockingPeriodStaking: data.lockingPeriodStaking,
		lockingPeriodSelfStaking: data.lockingPeriodSelfStaking,
	};
	return punishmentLockingPeriods;
};

const getPosRoundLength = async () => {
	const { data } = await getPosConstants();
	return data.roundLength;
};

module.exports = {
	getPosConstants,
	getPosTokenID,
	getPosPunishmentLockingPeriods,
	getPosRoundLength,
};
