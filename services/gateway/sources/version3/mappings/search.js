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
	accounts: ['data.accounts', accountsData],
	blocks: ['data.blocks', blocksData],
	transactions: ['data.transactions', transactionsData],
};
