const { recordAuthAccount } = require('../../../dataService/recorder/auth/account');

const multisignatureRegistrationController = async (event, isBlockDeletion) => {
	if (event.topics.length !== 2)
		throw new Error(`event topics for ${event.name} is not 2, got: [${event.topics.toString()}]`);

	const address = event.topics[1];
	recordAuthAccount(address, event.data, isBlockDeletion);
};

module.exports = { multisignatureRegistrationController };
