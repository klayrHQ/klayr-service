const { KeyRegResult } = require('../../../dataService/recorder/validators/constants');
const { recordValidatorsBLSKey } = require('../../../dataService/recorder/validators/keys');

const blsKeyRegistrationController = async (event, isBlockDeletion) => {
	if (event.data.result === KeyRegResult.SUCCESS) {
		if (event.topics.length !== 2)
			throw new Error(`event topics for ${event.name} is not 2, got: [${event.topics.toString()}]`);

		const address = event.topics[1];
		recordValidatorsBLSKey(
			address,
			event.data.blsKey,
			event.data.proofOfPossession,
			isBlockDeletion,
		);
	}
};

module.exports = { blsKeyRegistrationController };
