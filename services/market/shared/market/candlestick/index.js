const { getCandleStickBitrue } = require('./bitrue');
const { getCandleStickProbit } = require('./probit');

const getCandleStick = async params => {
	let ret;
	const promises = [getCandleStickBitrue, getCandleStickProbit];

	// eslint-disable-next-line no-restricted-syntax
	for (const method of promises) {
		try {
			ret = await method(params);
			break;
		} catch (err) {
			/* empty */
		}
	}

	if (!ret) throw new Error('All market source not available at the moment');

	return ret;
};

module.exports = {
	getCandleStick,
};
