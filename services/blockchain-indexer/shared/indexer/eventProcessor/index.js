const { recordTokenEvents, commitTokenIndex } = require('./token');

const recordEvents = async (block, events, isBlockDeletion) => {
	await recordTokenEvents(block, events, isBlockDeletion);
};

const commitEvent = async dbTrx => {
	await commitTokenIndex(dbTrx);
};

module.exports = { recordEvents, commitEvent };
