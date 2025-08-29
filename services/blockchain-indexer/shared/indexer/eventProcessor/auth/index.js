const BluebirdPromise = require('bluebird');
const { commitAuthAccount } = require('../../../dataService/recorder/auth/account');
const { multisignatureRegistrationController } = require('./multisignatureRegistration');

const doNothing = async (_event, _isBlockDeletion) => {};

const RECORD_MAX_CONCURRENCY = 16;

const commitAuthControllers = [commitAuthAccount];

const authIndexController = {
	multisignatureRegistration: multisignatureRegistrationController,
	invalidSignature: doNothing,
	commandExecutionResult: doNothing,
};

const recordAuthEvents = async (_block, events, isBlockDeletion) => {
	await BluebirdPromise.map(
		events,
		async event => {
			if (event.module === 'auth' && authIndexController[event.name]) {
				await authIndexController[event.name](event, isBlockDeletion);
			}
		},
		{ concurrency: Math.min(events.length, RECORD_MAX_CONCURRENCY) },
	);
};

const commitAuthIndex = async dbTrx => {
	await BluebirdPromise.map(commitAuthControllers, async controller => await controller(dbTrx), {
		concurrency: commitAuthControllers.length,
	});
};

module.exports = { recordAuthEvents, commitAuthIndex };
