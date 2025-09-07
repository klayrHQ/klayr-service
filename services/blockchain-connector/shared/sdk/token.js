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
const { invokeEndpoint } = require('./client');
const { isMainchain } = require('./interoperability');
const { getGenesisAssetByModule } = require('./genesisBlock');
const { MODULE_NAME_TOKEN } = require('./constants/names');

let escrowedAmounts;
let supportedTokens;
let totalSupply;
let initializationFees;

const getTokenBalances = async address => {
	const balances = await invokeEndpoint('token_getBalances', { address });
	return balances;
};

const getTokenBalance = async ({ address, tokenID }) => {
	const balance = await invokeEndpoint('token_getBalance', { address, tokenID });
	return balance;
};

// NOTE: since now updateTokenInfo doesn't periodically update this info, any request to this info should be forceUpdated
const getEscrowedAmounts = async (isForceUpdate = true) => {
	if (isForceUpdate || !escrowedAmounts) {
		escrowedAmounts = await invokeEndpoint('token_getEscrowedAmounts');
	}
	return escrowedAmounts;
};

// NOTE: since now updateTokenInfo doesn't periodically update this info, any request to this info should be forceUpdated
const getSupportedTokens = async (isForceUpdate = true) => {
	if (isForceUpdate || !supportedTokens) {
		supportedTokens = await invokeEndpoint('token_getSupportedTokens');
	}
	return supportedTokens;
};

// NOTE: since now updateTokenInfo doesn't periodically update this info, any request to this info should be forceUpdated
const getTotalSupply = async (isForceUpdate = true) => {
	if (isForceUpdate || !totalSupply) {
		totalSupply = await invokeEndpoint('token_getTotalSupply');
	}
	return totalSupply;
};

const getTokenInitializationFees = async () => {
	if (!initializationFees) {
		const response = await invokeEndpoint('token_getInitializationFees');
		if (response.error) throw new Error(response.error);
		initializationFees = response;
	}
	return initializationFees;
};

const hasUserAccount = async ({ address, tokenID }) =>
	invokeEndpoint('token_hasUserAccount', { address, tokenID });

const hasEscrowAccount = async ({ tokenID, escrowChainID }) =>
	invokeEndpoint('token_hasEscrowAccount', { tokenID, escrowChainID });

// NOTE: escrowed amounts, supported tokens, and total supply, now already indexed dynamically on each block indexing
const updateTokenInfo = async () => {
	// escrowedAmounts = await getEscrowedAmounts(true);
	// if (!(await isMainchain()) || !supportedTokens) supportedTokens = await getSupportedTokens(true);
	// totalSupply = await getTotalSupply(true);
};

const getTokenBalancesAtGenesis = async address => {
	const MODULE_TOKEN_SUBSTORE_USER = 'userSubstore';

	const tokenModuleGenesisAssets = await getGenesisAssetByModule({
		module: MODULE_NAME_TOKEN,
		subStore: MODULE_TOKEN_SUBSTORE_USER,
	});

	const balancesAtGenesis = tokenModuleGenesisAssets[MODULE_TOKEN_SUBSTORE_USER];
	const balancesByAddress = balancesAtGenesis.filter(e => e.address === address);

	return balancesByAddress;
};

module.exports = {
	tokenHasUserAccount: hasUserAccount,
	tokenHasEscrowAccount: hasEscrowAccount,
	getTokenBalance,
	getTokenBalances,
	getEscrowedAmounts,
	getSupportedTokens,
	getTotalSupply,
	getTokenInitializationFees,
	updateTokenInfo,
	getTokenBalancesAtGenesis,
};
