const { KeyRegResult } = require('../../../dataService/recorder/validators/constants');
const { recordValidatorsGeneratorKey } = require('../../../dataService/recorder/validators/keys');

const generatorKeyRegistrationController = async (event, isBlockDeletion) => {
	if (event.data.result === KeyRegResult.SUCCESS) {
		if (event.topics.length !== 2)
			throw new Error(`event topics for ${event.name} is not 2, got: [${event.topics.toString()}]`);

		const address = event.topics[1];
		recordValidatorsGeneratorKey(address, event.data.generatorKey, isBlockDeletion);
	}
};

module.exports = { generatorKeyRegistrationController };
