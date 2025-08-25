const { recordAuthEvents, commitAuthIndex } = require('./auth');
const { recordTokenEvents, commitTokenIndex } = require('./token');

const recordEvents = async (block, events, isBlockDeletion) => {
	await recordTokenEvents(block, events, isBlockDeletion);
	await recordAuthEvents(block, events, isBlockDeletion);

	// NOTE: validator keys seems to have been update through: registerValidator.js & updateGeneratorKey.js; disable recordValidatorEvents here for efficiency
	// await recordValidatorEvents(block, events, isBlockDeletion);
};

const commitEvent = async dbTrx => {
	await commitTokenIndex(dbTrx);
	await commitAuthIndex(dbTrx);

	// NOTE: validator keys seems to have been update through: registerValidator.js & updateGeneratorKey.js; disable commitValidatorIndex here for efficiency
	// await commitValidatorIndex(dbTrx);
};

module.exports = { recordEvents, commitEvent };
