const BluebirdPromise = require('bluebird');
const { blsKeyRegistrationController } = require('./blsKeyRegistration');
const { generatorKeyRegistrationController } = require('./generatorKeyRegistration');
const { commitValidatorsKeys } = require('../../../dataService/recorder/validators/keys');

const doNothing = async (_event, _isBlockDeletion) => {};

const RECORD_MAX_CONCURRENCY = 16;

const commitValidatorControllers = [commitValidatorsKeys];

const validatorIndexController = {
	blsKeyRegistration: blsKeyRegistrationController,
	generatorKeyRegistration: generatorKeyRegistrationController,
	commandExecutionResult: doNothing,
};

const recordValidatorEvents = async (_block, events, isBlockDeletion) => {
	await BluebirdPromise.map(
		events,
		async event => {
			if (event.module === 'validators' && validatorIndexController[event.name]) {
				await validatorIndexController[event.name](event, isBlockDeletion);
			}
		},
		{ concurrency: Math.min(events.length, RECORD_MAX_CONCURRENCY) },
	);
};

const commitValidatorIndex = async dbTrx => {
	await BluebirdPromise.map(
		commitValidatorControllers,
		async controller => await controller(dbTrx),
		{
			concurrency: commitValidatorControllers.length,
		},
	);
};

module.exports = { recordValidatorEvents, commitValidatorIndex };
