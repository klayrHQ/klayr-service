const BluebirdPromise = require('bluebird');

const { tokenIndexController } = require('./controller');
const { commitTokenBalanceIndex, recordTokenBalanceAddition } = require('./shared/balances');
const { commitTokenLockedIndex, recordTokenLocked } = require('./shared/locked');
const { commitTokenSupplyIndex, recordTokenSupplyIncrease } = require('./shared/supply');
const { commitTokenEscrowedIndex, recordTokenEscrowed } = require('./shared/escrowed');
const { initTokenIndexerContext, clearTokenIndexerContext } = require('./shared/context');

const RECORD_MAX_CONCURRENCY = 16;

const commitTokenControllers = [
	commitTokenBalanceIndex,
	commitTokenLockedIndex,
	commitTokenSupplyIndex,
	commitTokenEscrowedIndex,
];

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
