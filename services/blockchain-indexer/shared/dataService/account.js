const business = require('./business');

const getAccount = async params => {
	const accounts = {
		data: [],
		meta: {},
	};

	const response = await business.getAccount(params);
	if (response.data) accounts.data = response.data;
	if (response.meta) accounts.meta = response.meta;

	return accounts;
};

module.exports = { getAccount };
