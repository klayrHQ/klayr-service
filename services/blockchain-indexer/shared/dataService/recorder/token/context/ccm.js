const { codec } = require('@klayr/codec');
const { utils } = require('@klayr/cryptography');

const { CCMSchemaConstants } = require('../constants/ccm');
const { address } = require('@klayr/cryptography');

const ccmSchema = {
	$id: '/modules/interoperability/ccm',
	type: 'object',
	required: [
		'module',
		'crossChainCommand',
		'nonce',
		'fee',
		'sendingChainID',
		'receivingChainID',
		'params',
		'status',
	],
	properties: {
		module: {
			dataType: 'string',
			minLength: CCMSchemaConstants.MIN_MODULE_NAME_LENGTH,
			maxLength: CCMSchemaConstants.MAX_MODULE_NAME_LENGTH,
			fieldNumber: 1,
		},
		crossChainCommand: {
			dataType: 'string',
			minLength: CCMSchemaConstants.MIN_CROSS_CHAIN_COMMAND_NAME_LENGTH,
			maxLength: CCMSchemaConstants.MAX_CROSS_CHAIN_COMMAND_NAME_LENGTH,
			fieldNumber: 2,
		},
		nonce: {
			dataType: 'uint64',
			fieldNumber: 3,
		},
		fee: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		sendingChainID: {
			dataType: 'bytes',
			minLength: CCMSchemaConstants.CHAIN_ID_LENGTH,
			maxLength: CCMSchemaConstants.CHAIN_ID_LENGTH,
			fieldNumber: 5,
		},
		receivingChainID: {
			dataType: 'bytes',
			minLength: CCMSchemaConstants.CHAIN_ID_LENGTH,
			maxLength: CCMSchemaConstants.CHAIN_ID_LENGTH,
			fieldNumber: 6,
		},
		params: {
			dataType: 'bytes',
			fieldNumber: 7,
		},
		status: {
			dataType: 'uint32',
			fieldNumber: 8,
		},
	},
};

const crossChainTransferMessageParams = {
	/** The unique identifier of the schema. */
	$id: '/klayr/ccTransferMessageParams',
	type: 'object',
	/** The required parameters for the command. */
	required: ['tokenID', 'amount', 'senderAddress', 'recipientAddress', 'data'],
	/** A list describing the available parameters for the CCM. */
	properties: {
		/**
		 * ID of the tokens being transferred.
		 * `minLength` and `maxLength` are {@link TOKEN_ID_LENGTH}.
		 */
		tokenID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CCMSchemaConstants.TOKEN_ID_LENGTH,
			maxLength: CCMSchemaConstants.TOKEN_ID_LENGTH,
		},
		/** Amount of tokens to be transferred in Beddows. */
		amount: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		/** Address of the sender. */
		senderAddress: {
			dataType: 'bytes',
			fieldNumber: 3,
			format: 'klayr32',
		},
		/** Address of the recipient. */
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 4,
			format: 'klayr32',
		},
		/** Optional field for data / messages.
		 *
		 * `minLength is `0`.
		 * `maxLength` is {@link MAX_DATA_LENGTH}.
		 */
		data: {
			dataType: 'string',
			fieldNumber: 5,
			minLength: 0,
			maxLength: CCMSchemaConstants.MAX_DATA_LENGTH,
		},
	},
};

const getIDFromCCMBytes = ccmBytes => utils.hash(ccmBytes);

const getEncodedCCMAndID = ccm => {
	const encodedCCM = codec.encode(ccmSchema, ccm);
	return { encodedCCM, ccmID: getIDFromCCMBytes(encodedCCM) };
};

const getCcmID = ccmData => {
	const ccm = {
		module: ccmData.module,
		crossChainCommand: ccmData.crossChainCommand,
		nonce: BigInt(ccmData.nonce),
		fee: BigInt(ccmData.fee),
		sendingChainID: Buffer.from(ccmData.sendingChainID, 'hex'),
		receivingChainID: Buffer.from(ccmData.receivingChainID, 'hex'),
		params: Buffer.from(ccmData.params, 'hex'),
		status: ccmData.status,
	};
	return getEncodedCCMAndID(ccm).ccmID.toString('hex');
};

const getCcmIDForTokenCrossChainTransfer = ccmData => {
	if (ccmData.module !== 'token' && ccmData.crossChainCommand !== 'transferCrossChain') {
		throw new Error('crossChainCommand type on ccm is not transferCrossChain');
	}

	const decodedParams = decodeTransferCrossChainCCMParams(ccmData.params);

	const senderAddress = address.getKlayr32AddressFromAddress(decodedParams.senderAddress);
	const recipientAddress = address.getKlayr32AddressFromAddress(decodedParams.recipientAddress);
	const tokenID = decodedParams.tokenID.toString('hex');
	const amount = decodedParams.amount.toString();

	const identifier = `${senderAddress}:${recipientAddress}:${tokenID}:${amount}`;
	return utils.hash(identifier, 'utf8').toString('hex');
};

const getCcmIDFromCcmTransferEvent = eventData => {
	const identifier = `${eventData.senderAddress}:${eventData.recipientAddress}:${eventData.tokenID}:${eventData.amount}`;
	return utils.hash(identifier, 'utf8').toString('hex');
};

const decodeTransferCrossChainCCMParams = params => {
	return codec.decode(
		crossChainTransferMessageParams,
		Buffer.isBuffer(params) ? params : Buffer.from(params, 'hex'),
	);
};

module.exports = { getCcmID, getCcmIDForTokenCrossChainTransfer, getCcmIDFromCcmTransferEvent };
