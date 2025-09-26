module.exports = {
	address: '=,string',
	publicKey: '=,string',
	name: '=,string',
	nonce: '=,string',
	description: '=,string',
	tokenBalances: [
		'tokenBalances',
		{
			tokenID: '=,string',
			totalBalance: '=,string',
			availableBalance: '=,string',
			lockedBalance: '=,string',
		},
	],
};
