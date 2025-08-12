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

const recordTokenGenesisAssets = async data => {
	// Indexing userSubstore genesis asset
	for (let i = 0; i < data.userSubstore.length; i++) {
		const userSubstoreData = data.userSubstore[i];
		recordTokenBalanceAddition(
			userSubstoreData.address,
			userSubstoreData.tokenID,
			userSubstoreData.availableBalance,
		);
		for (let k = 0; k < userSubstoreData.lockedBalances.length; k++) {
			const lockedBalance = userSubstoreData.lockedBalances[k];
			recordTokenLocked(
				userSubstoreData.address,
				userSubstoreData.tokenID,
				lockedBalance.module,
				lockedBalance.amount,
			);
		}
	}

	// Indexing supplySubstore genesis asset
	for (let i = 0; i < data.supplySubstore.length; i++) {
		const supplyData = data.supplySubstore[i];
		recordTokenSupplyIncrease(supplyData.tokenID, supplyData.totalSupply);
	}

	// Indexing escrowSubstore genesis asset
	for (let i = 0; i < data.escrowSubstore.length; i++) {
		const escrowData = data.escrowSubstore[i];
		recordTokenEscrowed(escrowData.escrowChainID, escrowData.tokenID, escrowData.amount);
	}
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

module.exports = { recordTokenEvents, commitTokenIndex, recordTokenGenesisAssets };
