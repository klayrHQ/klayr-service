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

const doNothing = async (_event, _isBlockDeletion) => {};

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

module.exports = { tokenIndexController };
