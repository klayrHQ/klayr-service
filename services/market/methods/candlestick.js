const { getCandleStick } = require('../shared/market/candlestick');

module.exports = [
	{
		name: 'candlestick',
		controller: getCandleStick,
		params: {
			symbol: { optional: false, type: 'string' },
			interval: { optional: false, type: 'string' },
			start: { optional: false, type: 'number' },
			end: { optional: false, type: 'number' },
		},
	},
];
