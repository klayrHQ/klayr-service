const BluebirdPromise = require('bluebird');
const { allTokensFromChainSupportedController } = require('./allTokensFromChainSupported');
const {
	allTokensFromChainSupportRemovedController,
} = require('./allTokensFromChainSupportRemoved');
const { allTokensSupportRemovedController } = require('./allTokensSupportRemoved');
const { allTokensSupportedController } = require('./allTokensSupported');
const { beforeCCCExecutionController } = require('./beforeCCCExecution');
const { beforeCCMForwardingController } = require('./beforeCCMForwarding');
const { burnController } = require('./burn');
const { ccmTransferController } = require('./ccmTransfer');
const { initializeTokenController } = require('./initializeToken');
const { initializeUserAccountController } = require('./initializeUserAccount');
const { lockController } = require('./lock');
const { mintController } = require('./mint');
const { recoverController } = require('./recover');
const { transferController } = require('./transfer');
const { transferCrossChainController } = require('./transferCrossChain');
const { unlockController } = require('./unlock');
const { tokenIDSupportRemovedController } = require('./tokenIDSupportRemoved');
const { tokenIDSupportedController } = require('./tokenIDSupported');
const { commitTokenBalanceIndex } = require('../../../dataService/recorder/token/balances');
const { commitTokenLockedIndex } = require('../../../dataService/recorder/token/locked');
const { commitTokenSupplyIndex } = require('../../../dataService/recorder/token/supply');
const { commitTokenEscrowedIndex } = require('../../../dataService/recorder/token/escrowed');
const {
	initTokenIndexerContext,
	clearTokenIndexerContext,
} = require('../../../dataService/recorder/token/context');
const { commitAccountIndex } = require('../../../dataService/recorder/token/account');

const doNothing = async (_event, _isBlockDeletion) => {};

const RECORD_MAX_CONCURRENCY = 16;

const commitTokenControllers = [
	commitTokenBalanceIndex,
	commitTokenLockedIndex,
	commitTokenSupplyIndex,
	commitTokenEscrowedIndex,
	commitAccountIndex,
];

const tokenIndexController = {
	allTokensFromChainSupportRemoved: allTokensFromChainSupportRemovedController,
	allTokensFromChainSupported: allTokensFromChainSupportedController,
	allTokensSupportRemoved: allTokensSupportRemovedController,
	allTokensSupported: allTokensSupportedController,
	beforeCCCExecution: beforeCCCExecutionController,
	beforeCCMForwarding: beforeCCMForwardingController,
	burn: burnController,
	ccmTransferEvent: ccmTransferController,
	initializeToken: initializeTokenController,
	initializeUserAccount: initializeUserAccountController, // NOTE: payFee() balance change already handled by burn()
	lock: lockController,
	mint: mintController,
	recover: recoverController,
	tokenIDSupportRemoved: tokenIDSupportRemovedController,
	tokenIDSupported: tokenIDSupportedController,
	transferCrossChain: transferCrossChainController,
	transfer: transferController,
	unlock: unlockController,

	// token events with no database record changes
	initializeEscrowAccount: doNothing,
	commandExecutionResult: doNothing,
};

const recordTokenEvents = async (block, events, isBlockDeletion) => {
	await initTokenIndexerContext(block, events);

	await BluebirdPromise.map(
		events,
		async event => {
			if (event.module === 'token' && tokenIndexController[event.name]) {
				await tokenIndexController[event.name](event, isBlockDeletion);
			}
		},
		{ concurrency: Math.min(events.length, RECORD_MAX_CONCURRENCY) },
	);
};

const commitTokenIndex = async dbTrx => {
	await BluebirdPromise.map(commitTokenControllers, async controller => await controller(dbTrx), {
		concurrency: commitTokenControllers.length,
	});

	clearTokenIndexerContext();
};

module.exports = { recordTokenEvents, commitTokenIndex };
