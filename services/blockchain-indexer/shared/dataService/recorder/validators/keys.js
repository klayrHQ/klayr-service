const {
	DB: {
		MySQL: { getTableInstance },
	},
	Logger,
} = require('klayr-service-framework');
const BluebirdPromise = require('bluebird');

const config = require('../../../../config');
const validatosrTableSchema = require('../../../database/schema/validators');

const logger = Logger();

const MYSQL_ENDPOINT = config.endpoints.mysql;
const COMMIT_MAX_CONCURRENCY = 16;

const getValidatorsTable = () => getTableInstance(validatosrTableSchema, MYSQL_ENDPOINT);

// The key is 'address' and the value is the validator keys object
const validatorsKeysUpdatesMap = new Map();

const getValidatorsKeysUpdatesMap = () => validatorsKeysUpdatesMap;

const updateValidatorsKeysDB = async (address, blsKey, proofOfPossession, generatorKey, dbTrx) => {
	const validatorsTable = await getValidatorsTable();
	await validatorsTable.upsert(
		{
			address,
			blsKey,
			proofOfPossession,
			generatorKey,
		},
		dbTrx,
	);
};

const recordValidatorsBLSKey = (address, blsKey, proofOfPossession, isBlockDeletion) => {
	logger.debug(
		`Recording validator BLS Key for address: ${address}, isBlockDeletion: ${isBlockDeletion}`,
	);

	let validatorData = validatorsKeysUpdatesMap.get(address);
	if (!validatorData) validatorData = { address };

	if (isBlockDeletion) {
		validatorData.blsKey = null;
		validatorData.proofOfPossession = null;
	} else {
		validatorData.blsKey = blsKey;
		validatorData.proofOfPossession = proofOfPossession;
	}

	validatorsKeysUpdatesMap.set(address, validatorData);
};

const recordValidatorsGeneratorKey = (address, generatorKey, isBlockDeletion) => {
	logger.debug(
		`Recording validator generatorKey for address: ${address}, isBlockDeletion: ${isBlockDeletion}`,
	);

	let validatorData = validatorsKeysUpdatesMap.get(address);
	if (!validatorData) validatorData = { address };

	if (isBlockDeletion) {
		validatorData.generatorKey = null;
	} else {
		validatorData.generatorKey = generatorKey;
	}

	validatorsKeysUpdatesMap.set(address, validatorData);
};

const commitValidatorsKeys = async dbTrx => {
	if (validatorsKeysUpdatesMap.size === 0) {
		logger.trace('No validators keys updates to commit.');
		return;
	}

	logger.debug(`Committing ${validatorsKeysUpdatesMap.size} validators keys updates.`);
	const validatorsTable = await getValidatorsTable();

	await BluebirdPromise.map(
		validatorsKeysUpdatesMap.entries(),
		async ([address, validatorsData]) => {
			logger.trace(`Processing validators keys update for address: ${address}`);
			await validatorsTable.upsert({ address, ...validatorsData }, dbTrx);
		},
		{ concurrency: Math.min(validatorsKeysUpdatesMap.size, COMMIT_MAX_CONCURRENCY) },
	);

	validatorsKeysUpdatesMap.clear();
	logger.debug('Committed validators keys updates successfully.');
};

module.exports = {
	getValidatorsKeysUpdatesMap,
	updateValidatorsKeysDB,
	recordValidatorsBLSKey,
	recordValidatorsGeneratorKey,
	commitValidatorsKeys,
};
