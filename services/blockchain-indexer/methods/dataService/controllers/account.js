const dataService = require('../../../shared/dataService');

const getAccount = async params => {
	const account = {
		data: {},
		meta: {},
	};
	const response = await dataService.getAccount(params);
	if (response.data) account.data = response.data;
	if (response.meta) account.meta = response.meta;

	return account;
};

module.exports = {
	getAccount,
};
