const CCMProcessedResult = {
	// Value of result of CCM Processed Event if CCM is applied
	APPLIED: 0,
	// Value of result of CCM Processed Event if CCM is forwarded
	FORWARDED: 1,
	// Value of result of CCM Processed Event if CCM is bounced
	BOUNCED: 2,
	// Value of result of CCM Processed Event if CCM is discarded
	DISCARDED: 3,
};

const CCMProcessedCode = {
	// Value of code of CCM Processed Event if processing succeeded
	SUCCESS: 0,
	// Value of code of CCM Processed Event if processing failed due to: channel unavailable
	CHANNEL_UNAVAILABLE: 1,
	// Value of code of CCM Processed Event if processing failed due to: module not supported
	MODULE_NOT_SUPPORTED: 2,
	// Value of code of CCM Processed Event if processing failed due to: cross-chain command not supported
	CROSS_CHAIN_COMMAND_NOT_SUPPORTED: 3,
	// Value of code of CCM Processed Event if processing failed due to: exception in cross-chain command execution
	FAILED_CCM: 4,
	// Value of code of CCM Processed Event if processing failed due to: exception in ccm decoding
	INVALID_CCM_DECODING_EXCEPTION: 5,
	// Value of code of CCM Processed Event if processing failed due to: exception in format validation
	INVALID_CCM_VALIDATION_EXCEPTION: 6,
	// Value of code of CCM Processed Event if processing failed due to: exception in validation of ccm routing rules
	INVALID_CCM_ROUTING_EXCEPTION: 7,
	// Value of code of CCM Processed Event if processing failed due to: exception in CCM verification
	INVALID_CCM_VERIFY_CCM_EXCEPTION: 8,
	// Value of code of CCM Processed Event if processing failed due to: exception in cross-chain command verification
	INVALID_CCM_VERIFY_EXCEPTION: 9,
	// Value of code of CCM Processed Event if processing failed due to: exception in before cross-chain command execution
	INVALID_CCM_BEFORE_CCC_EXECUTION_EXCEPTION: 10,
	// Value of code of CCM Processed Event if processing failed due to: exception in after cross-chain command execution
	INVALID_CCM_AFTER_CCC_EXECUTION_EXCEPTION: 11,
	// Value of code of CCM Processed Event if processing failed due to: exception in before cross-chain command forwarding
	INVALID_CCM_BEFORE_CCC_FORWARDING_EXCEPTION: 12,
};

const CCMStatusCode = {
	// Value of status of a new CCM which is not a response due do an error
	OK: 0,
	// Value of status of returned CCM due to error: channel unavailable
	CHANNEL_UNAVAILABLE: 1,
	// Value of status of returned CCM due to error: module not supported
	MODULE_NOT_SUPPORTED: 2,
	// Value of status of returned CCM due to error: cross-chain command not supported
	CROSS_CHAIN_COMMAND_NOT_SUPPORTED: 3,
	// Value of status of returned CCM due to error: failed ccm execution
	FAILED_CCM: 4,
	// Value of status of CCM that have been recovered with a message recovery command
	RECOVERED: 5,
};

const CHAIN_ID_LENGTH = 4;
const LOCAL_ID_LENGTH = 4;
const TOKEN_ID_LENGTH = CHAIN_ID_LENGTH + LOCAL_ID_LENGTH;

const CCMSchemaConstants = {
	MIN_MODULE_NAME_LENGTH: 1,
	MAX_MODULE_NAME_LENGTH: 32,
	MIN_CROSS_CHAIN_COMMAND_NAME_LENGTH: 1,
	MAX_CROSS_CHAIN_COMMAND_NAME_LENGTH: 32,
	CHAIN_ID_LENGTH,
	LOCAL_ID_LENGTH,
	TOKEN_ID_LENGTH,
	MAX_DATA_LENGTH: 64,
};

module.exports = { CCMProcessedResult, CCMProcessedCode, CCMSchemaConstants, CCMStatusCode };
