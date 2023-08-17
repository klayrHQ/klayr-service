/*
 * LiskHQ/lisk-service
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
	isPosModuleRegistered,
	getNumberOfGenerators,
	reloadGeneratorsCache,
	getFinalizedHeight,
	normalizeBlocks,
	getBlockByHeight,
	getBlockByID,
	loadAllPendingTransactions,
	getTransactionIDsByBlockID,
	getTransactionsByIDs,
	normalizeTransaction,
	getEventsByHeight,
	cacheEventsByBlockID,
	getEventsByBlockID,
	deleteEventsFromCache,
	isMainchain,
	resolveMainchainServiceURL,
} = require('./business');

const {
	getBlocks,
	getBlocksAssets,
	setLastBlock,
	getLastBlock,
	getTotalNumberOfBlocks,
	performLastBlockUpdate,
} = require('./blocks');

const {
	getPosValidators,
	getAllValidators,
	reloadValidatorCache,
	getPosConstants,
	getPosLockedRewards,
	getStakes,
	getStakers,
	getPosUnlocks,
	getPosClaimableRewards,
} = require('./pos');

const {
	getDefaultRewardAtHeight,
	getAnnualInflation,
	getRewardConstants,
} = require('./dynamicReward');

const {
	tokenHasUserAccount,
	getAvailableTokenIDs,
	getTokenBalances,
	getTokenSummary,
	getTokenConstants,
	getTokenTopBalances,
} = require('./token');

const {
	getNFTs,
} = require('./nft');

const {
	getTransactions,
	getPendingTransactions,
	reloadAllPendingTransactions,
	postTransactions,
	getTransactionsByBlockID,
	dryRunTransactions,
	estimateTransactionFees,
} = require('./transactions');

const {
	getBlockchainApps,
	getBlockchainAppsStatistics,
	getChainAccount,
	getMainchainID,
	reloadBlockchainAppsStats,
} = require('./interoperability');

const { getEvents } = require('./events');
const { getSchemas } = require('./schemas');
const { getAuthAccountInfo } = require('./auth');
const {
	getNetworkStatus,
	getNetworkPeers,
	getNetworkConnectedPeers,
	getNetworkDisconnectedPeers,
	getNetworkPeersStatistics,
} = require('./network');
const { getIndexStatus, isBlockchainFullyIndexed } = require('./indexStatus');
const { getLegacyAccountInfo } = require('./legacy');
const { getValidator, validateBLSKey } = require('./validator');
const { getGenerators } = require('./generators');
const { invokeEndpoint } = require('./invoke');

const {
	getNFTConstants,
	getNFTSupported,
} = require('./nft');

module.exports = {
	// Blocks
	getBlocks,
	getBlocksAssets,
	setLastBlock,
	getLastBlock,
	getTotalNumberOfBlocks,
	performLastBlockUpdate,

	// PoS
	getPosValidators,
	getAllValidators,
	reloadValidatorCache,
	getPosConstants,
	getPosUnlocks,
	getStakes,
	getStakers,
	getPosClaimableRewards,

	// NFTs
	getNFTs,

	// Token
	tokenHasUserAccount,
	getAvailableTokenIDs,
	getTokenBalances,
	getTokenSummary,
	getTokenConstants,
	getTokenTopBalances,

	// Transactions
	getTransactions,
	getPendingTransactions,
	reloadAllPendingTransactions,
	postTransactions,
	getTransactionsByBlockID,
	dryRunTransactions,
	estimateTransactionFees,

	// Interoperability
	getBlockchainApps,
	getBlockchainAppsStatistics,
	getChainAccount,
	getMainchainID,
	reloadBlockchainAppsStats,

	// Events
	getEvents,

	// Schemas
	getSchemas,

	// Auth
	getAuthAccountInfo,

	// Network
	getNetworkStatus,
	getNetworkPeers,
	getNetworkConnectedPeers,
	getNetworkDisconnectedPeers,
	getNetworkPeersStatistics,

	// Index Status
	getIndexStatus,
	isBlockchainFullyIndexed,

	// Legacy
	getLegacyAccountInfo,

	// Validator
	getValidator,
	validateBLSKey,

	// Generators
	reloadGeneratorsCache,
	getGenerators,

	isPosModuleRegistered,
	getNumberOfGenerators,
	getFinalizedHeight,
	normalizeBlocks,
	getBlockByHeight,
	getBlockByID,
	loadAllPendingTransactions,
	getTransactionIDsByBlockID,
	getTransactionsByIDs,
	normalizeTransaction,
	getPosLockedRewards,
	getEventsByHeight,
	cacheEventsByBlockID,
	getEventsByBlockID,
	deleteEventsFromCache,

	getAnnualInflation,
	getDefaultRewardAtHeight,
	getRewardConstants,

	isMainchain,
	resolveMainchainServiceURL,

	invokeEndpoint,

	// NFT
	getNFTConstants,
	getNFTSupported,
};
