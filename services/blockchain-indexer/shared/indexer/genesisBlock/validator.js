const { Logger } = require('klayr-service-framework');
const { updateValidatorsKeysDB } = require('../../dataService/recorder/validators/keys');

const logger = Logger();

const genesisValidatorsKeys = [];

const indexValidatorModuleGenesisEvents = async events => {
	logger.info('Starting to index the genesis events from the Validator module.');

	const validatorsMap = new Map();

	for (const event of events) {
		if (event.module !== 'validators') continue;

		const address = event.topics[1];
		const existing = validatorsMap.get(address) || { address };

		if (event.name === 'blsKeyRegistration') {
			existing.blsKey = event.data.blsKey;
			existing.proofOfPossession = event.data.proofOfPossession;
		}

		if (event.name === 'generatorKeyRegistration') {
			existing.generatorKey = event.data.generatorKey;
		}

		validatorsMap.set(address, existing);
	}

	genesisValidatorsKeys.length = 0;
	genesisValidatorsKeys.push(...Array.from(validatorsMap.values()));

	startGenesisValidatorsKeysIndexing();

	logger.info('Finished indexing all the genesis events from the Validator module.');
};

let indexedValidatorsKeys;
let interval;

const processGenesisValidatorsKeysIndexing = async () => {
	try {
		if ([genesisValidatorsKeys.length].some(item => item > 0)) {
			if (indexedValidatorsKeys === false) return;
		} else {
			if (indexedValidatorsKeys === true) clearInterval(interval);
			return;
		}
		indexedValidatorsKeys = false;

		logger.info('Started indexing genesis validator keys events in the background.');

		let numValidatorsEntries = 0;
		while (genesisValidatorsKeys.length) {
			const { address, blsKey, proofOfPossession, generatorKey } = genesisValidatorsKeys.shift();
			try {
				await updateValidatorsKeysDB(address, blsKey, proofOfPossession, generatorKey);
				numValidatorsEntries++;
			} catch (err) {
				genesisValidatorsKeys.push({ address, blsKey, proofOfPossession, generatorKey });
				logger.warn(
					`Updating genesis validator keys for ${address} failed. Will retry.\nError: ${err.message}`,
				);
			}
		}

		indexedValidatorsKeys = true;
		logger.info(
			`Finished indexing genesis validator keys events. Added: ${numValidatorsEntries} validators entries.`,
		);
	} catch (_) {
		// No actions required
	}
};

const startGenesisValidatorsKeysIndexing = () => {
	setTimeout(processGenesisValidatorsKeysIndexing, 0);
	interval = setInterval(processGenesisValidatorsKeysIndexing, 5 * 60 * 1000);
};

module.exports = {
	indexValidatorModuleGenesisEvents,
};
