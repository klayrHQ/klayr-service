const accountsData = {
	name: '=,string',
	address: '=,string',
};

const blocksData = {
	id: '=,string',
	height: '=,number',
};

const transactionsData = {
	id: '=,string',
	sender: '=,string',
};

module.exports = {
	accounts: ['accounts', accountsData],
	blocks: ['blocks', blocksData],
	transactions: ['transactions', transactionsData],
};
