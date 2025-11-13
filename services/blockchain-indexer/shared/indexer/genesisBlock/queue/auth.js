const { updateAuthAccountDB } = require('../../../dataService/recorder/auth/account');

const indexGenesisAuthAccount = async payload => {
	await updateAuthAccountDB({
		...payload,
		nonce: BigInt(payload.nonce),
	});
};

module.exports = { indexGenesisAuthAccount };
