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
const {
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const config = require('../../../../config');
const pendingUnlocksTableSchema = require('../../../database/schema/pendingUnlocks');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getPendingUnlocksTable = () => getTableInstance(pendingUnlocksTableSchema, MYSQL_ENDPOINT);

const { getPosTokenID, getPosRoundLength } = require('./constants');
const { getBlockByID } = require('../blocks');
const { getNetworkStatus } = require('../network');
const { getAddressByName } = require('../../utils/validator');
const { getIndexedAccountInfo } = require('../../utils/account');
const { getKlayr32AddressFromPublicKey } = require('../../../utils/account');
const { indexAccountPublicKey } = require('../../../indexer/accountIndex');
const { getExpectedUnlockHeight, isCertificateGenerated } = require('../../../indexer/utils/pos');
const { getGenesisHeight } = require('../../../constants');

const getPosPendingUnlocksDB = async address => {
	const pendingUnlocksTable = await getPendingUnlocksTable();
	const pendingUnlocksData = await pendingUnlocksTable.find({ stakerAddress: address, limit: 1 }, [
		'validatorAddress',
		'amount',
		'unstakeHeight',
	]);

	const result = [];

	const {
		data: { lastBlockID },
	} = await getNetworkStatus();
	const lastBlock = await getBlockByID(lastBlockID);

	const height = lastBlock ? lastBlock.height : 0;
	const aggregateCommitHeight = lastBlock ? lastBlock.aggregateCommit.height : 0;
	const genesisHeight = await getGenesisHeight();
	const roundLength = await getPosRoundLength();

	for (let i = 0; i < pendingUnlocksData.length; i++) {
		const unlock = pendingUnlocksData[i];
		const expectedUnlockableHeight = await getExpectedUnlockHeight(
			address,
			unlock.validatorAddress,
			unlock.unstakeHeight,
		);
		const isCertified = isCertificateGenerated({
			maxHeightCertified: aggregateCommitHeight,
			roundLength,
			unlockObject: unlock,
			genesisHeight,
		});
		result.push({
			validatorAddress: unlock.validatorAddress,
			amount: unlock.amount.toString(),
			unstakeHeight: unlock.unstakeHeight,
			unlockable: height > expectedUnlockableHeight && isCertified,
			expectedUnlockableHeight,
		});
	}

	return result;
};

const getPosUnlocks = async params => {
	const unlocks = {
		data: {},
		meta: {
			count: 0,
			offset: 0,
			total: 0,
		},
	};

	if (params.name) params.address = await getAddressByName(params.name);
	if (params.publicKey) params.address = await getKlayr32AddressFromPublicKey(params.publicKey);

	if (!params.address) {
		return unlocks;
	}

	const [pendingUnlocks, networkStatus, tokenID, indexedAccountInfo] = await Promise.all([
		getPosPendingUnlocksDB(params.address),
		getNetworkStatus(),
		getPosTokenID(),
		getIndexedAccountInfo({ address: params.address, limit: 1 }, ['name', 'publicKey']),
	]);

	const {
		data: {
			lastBlockID,
			genesis: { blockTime },
		},
	} = networkStatus;
	const { height, timestamp } = await getBlockByID(lastBlockID);

	const filteredPendingUnlocks = pendingUnlocks.reduce((accumulator, pendingUnlock) => {
		const { unlockable, ...remPendingUnlock } = pendingUnlock;
		const isLocked = !pendingUnlock.unlockable;
		// Filter results based on `params.isLocked`
		if (params.isLocked === undefined || params.isLocked === isLocked) {
			// Calculate expected unlock time
			const expectedUnlockTime =
				timestamp + (remPendingUnlock.expectedUnlockableHeight - height) * blockTime;

			accumulator.push({
				...remPendingUnlock,
				isLocked,
				expectedUnlockTime,
				tokenID,
			});
		}
		return accumulator;
	}, []);

	const { publicKey, name } = indexedAccountInfo;

	// Update index if public key is not indexed asynchronously
	if (!publicKey && params.publicKey) indexAccountPublicKey(params.publicKey);

	unlocks.data = {
		address: params.address,
		publicKey: publicKey || null,
		name: name || null,
		pendingUnlocks: filteredPendingUnlocks,
	};

	const total = unlocks.data.pendingUnlocks.length;
	unlocks.data.pendingUnlocks = unlocks.data.pendingUnlocks.slice(
		params.offset,
		params.offset + params.limit,
	);

	unlocks.meta = {
		count: unlocks.data.pendingUnlocks.length,
		offset: params.offset,
		total,
	};

	return unlocks;
};

module.exports = {
	getPosUnlocks,
};
