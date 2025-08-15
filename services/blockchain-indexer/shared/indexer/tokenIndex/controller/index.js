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

const doNothing = async (_event, _isBlockDeletion) => {};

const tokenIndexController = {
	beforeCCCExecution: beforeCCCExecutionController,
	beforeCCMForwarding: beforeCCMForwardingController,
	burn: burnController,
	ccmTransferEvent: ccmTransferController,
	initializeToken: initializeTokenController,
	initializeUserAccount: initializeUserAccountController, // NOTE: payFee() balance change already handled by burn()
	lock: lockController,
	mint: mintController,
	recover: recoverController,
	transferCrossChain: transferCrossChainController,
	transfer: transferController,
	unlock: unlockController,

	// token events with no database record changes
	allTokensFromChainSupportRemoved: doNothing,
	allTokensFromChainSupported: doNothing,
	allTokensSupportRemoved: doNothing,
	allTokensSupported: doNothing,
	initializeEscrowAccount: doNothing,
	tokenIDSupportRemoved: doNothing,
	tokenIDSupported: doNothing,
	commandExecutionResult: doNothing,
};

module.exports = { tokenIndexController };
