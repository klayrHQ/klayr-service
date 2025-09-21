const BluebirdPromise = require('bluebird');
const { getAllValidators } = require('../../pos/validators');

const MAX_CONCURRENCY = 16;

const getPosValidatorsStatusCount = async params => {
	const status = {
		data: {
			active: 0,
			ineligible: 0,
			standby: 0,
			punished: 0,
			banned: 0,
		},
		meta: {},
	};

	const allValidators = await getAllValidators();

	await BluebirdPromise.map(allValidators, validators => status.data[validators.status]++, {
		concurrency: Math.min(MAX_CONCURRENCY, allValidators.length),
	});

	return status;
};

module.exports = { getPosValidatorsStatusCount };
