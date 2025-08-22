const { recordAuthEvents, commitAuthIndex } = require('./auth');
const { recordTokenEvents, commitTokenIndex } = require('./token');

const recordEvents = async (block, events, isBlockDeletion) => {
	await recordTokenEvents(block, events, isBlockDeletion);
	await recordAuthEvents(block, events, isBlockDeletion);
};

const commitEvent = async dbTrx => {
	await commitTokenIndex(dbTrx);
	await commitAuthIndex(dbTrx);
};

module.exports = { recordEvents, commitEvent };
