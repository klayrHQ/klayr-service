const mockTxRequest = {
	transaction: {
		module: 'token',
		command: 'transfer',
		nonce: '1',
		senderPublicKey: '3972849f2ab66376a68671c10a00e8b8b67d880434cc65b04c6ed886dfa91c2c',
		params: {
			tokenID: '0000000000000000',
			amount: '100000000000',
			receivingChainID: '00000001',
			recipientAddress: 'lskyvvam5rxyvbvofxbdfcupxetzmqxu22phm4yuo',
			data: '',
		},
		id: 'd96c777b67576ddf4cd933a97a60b4311881e68e3c8bef1393ac0020ec8a506c',
	},
};

const mockTransferCrossChainTxRequest = {
	transaction: {
		module: 'token',
		command: 'transferCrossChain',
		fee: '100000',
		nonce: '1',
		senderPublicKey: '3972849f2ab66376a68671c10a00e8b8b67d880434cc65b04c6ed886dfa91c2c',
		params: {
			tokenID: '0200000000000000',
			amount: '100000000000',
			receivingChainID: '02000000',
			recipientAddress: 'lskyvvam5rxyvbvofxbdfcupxetzmqxu22phm4yuo',
			data: '',
			messageFee: '10000000',
			messageFeeTokenID: '0200000000000000',
		},
		id: '0f77248481c050fcf4f88ef7b967548452869879137364df3b33da09cc419395',
	},
};

const mockTxResult = {
	data: {
		transaction: {
			fee: {
				tokenID: '0400000000000000',
				minimum: '172001',
			},
		},
	},
	meta: {
		breakdown: {
			fee: {
				minimum: {
					byteFee: '167000',
					additionalFees: {
						userAccountInitializationFee: '1',
					},
				},
			},
		},
	},
};

const mockTransferCrossChainTxResult = {
	data: {
		transaction: {
			fee: {
				tokenID: '0400000000000000',
				minimum: '172000',
			},
			params: {
				messageFee: {
					amount: '0',
					tokenID: '0400000000000000',
				},
			},
		},
	},
	meta: {
		breakdown: {
			fee: {
				minimum: {
					byteFee: '167000',
					additionalFees: {},
				},
			},
			params: {
				messageFee: {
					additionalFees: {
						userAccountInitializationFee: '1',
					},
					ccmByteFee: '0',
				},
			},
		},
	},
};

const mockTxsenderAddress = 'lskguo9kqnea2zsfo3a6qppozsxsg92nuuma3p7ad';

const mockTxAuthAccountInfo = {
	data: {
		nonce: '2',
		numberOfSignatures: 0,
		mandatoryKeys: [],
		optionalKeys: [],
	},
};

const mockTxrequestConnector = {
	module: 'token',
	command: 'transfer',
	fee: '100000000',
	nonce: '1',
	senderPublicKey: '3972849f2ab66376a68671c10a00e8b8b67d880434cc65b04c6ed886dfa91c2c',
	signatures: [
		'c7fd1abf9a552fa9c91b4121c87ae2c97cb0fc0aecc87d0ee8b1aa742238eef4a6815ddba31e21144c9652a7bd5c05577ae1100eac34fba43da6fc4879b8f206',
	],
	params: {
		tokenID: '0000000000000000',
		amount: '100000000000',
		recipientAddress: 'lskyvvam5rxyvbvofxbdfcupxetzmqxu22phm4yuo',
		data: '',
	},
	id: 'd96c777b67576ddf4cd933a97a60b4311881e68e3c8bef1393ac0020ec8a506c',
	size: 167,
	minFee: '166000',
};

const mockTransferCrossChainTxrequestConnector = {
	module: 'token',
	command: 'transferCrossChain',
	fee: '100000000',
	nonce: '1',
	senderPublicKey: '3972849f2ab66376a68671c10a00e8b8b67d880434cc65b04c6ed886dfa91c2c',
	signatures: [
		'c7fd1abf9a552fa9c91b4121c87ae2c97cb0fc0aecc87d0ee8b1aa742238eef4a6815ddba31e21144c9652a7bd5c05577ae1100eac34fba43da6fc4879b8f206',
	],
	params: {
		tokenID: '0000000000000000',
		amount: '100000000000',
		recipientAddress: 'lskyvvam5rxyvbvofxbdfcupxetzmqxu22phm4yuo',
		receivingChainID: '02000000',
		data: '',
		messageFee: '10000000',
		messageFeeTokenID: '0200000000000000',
	},
	id: 'd96c777b67576ddf4cd933a97a60b4311881e68e3c8bef1393ac0020ec8a506c',
	size: 167,
	minFee: '166000',
};

const posConstants = {
	data: {
		factorSelfStakes: 10,
		maxLengthName: 20,
		maxNumberSentStakes: 10,
		maxNumberPendingUnlocks: 20,
		failSafeMissedBlocks: 50,
		failSafeInactiveWindow: 260000,
		punishmentWindow: 780000,
		roundLength: 103,
		minWeightStandby: '100000000000',
		numberActiveValidators: 101,
		numberStandbyValidators: 2,
		posTokenID: '0400000000000000',
		validatorRegistrationFee: '1000000000',
		maxBFTWeightCap: 500,
		commissionIncreasePeriod: 260000,
		maxCommissionIncreaseRate: 500,
		useInvalidBLSKey: false,
	},
	meta: {},
};

const mockTxFeeEstimate = {
	blockHeight: 4756,
	low: 0,
	med: 0,
	high: 0,
	updated: 1687337100,
	blockID: 'a00ea9194baa4667078fd65372b8010c88aba6adb8b1cdc28f234798205d2d53',
	feeTokenID: '0400000000000000',
	minFeePerByte: 1000,
};

const mockEscrowAccountExistsRequestConnector = {
	exists: {
		escrowAccountExists: true,
	},
};

module.exports = {
	mockTxRequest,
	mockTransferCrossChainTxRequest,
	mockTxResult,
	mockTxsenderAddress,
	mockTxAuthAccountInfo,
	mockTxrequestConnector,
	mockTxFeeEstimate,
	posConstants,
	mockEscrowAccountExistsRequestConnector,
	mockTransferCrossChainTxrequestConnector,
	mockTransferCrossChainTxResult,
};