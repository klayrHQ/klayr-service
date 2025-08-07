/* eslint-disable import/no-unresolved */
const ccxt = require('ccxt');

const coinex = new ccxt.coinex();

const getCandleStickCoinex = async params => {
	let { symbol } = params;
	if (symbol.toUpperCase() === 'KLYUSD') symbol = 'KLYUSDT';
	let data = await coinex.fetchOHLCV(symbol, params.interval, Number(params.start) * 1000, 720);
	data = data.map(t => ({
		start: Math.floor(t[0] / 1000),
		open: t[1],
		high: t[2],
		low: t[3],
		close: t[4],
		volume: t[5],
		// source: ['coinex'],
	}));
	return data;
};

module.exports = {
	getCandleStickCoinex,
};
