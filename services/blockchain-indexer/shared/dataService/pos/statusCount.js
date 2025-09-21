const business = require('../business');

const getPosValidatorsStatusCount = async params => {
	const response = await business.getPosValidatorsStatusCount(params);
	return response;
};

module.exports = {
	getPosValidatorsStatusCount,
};
