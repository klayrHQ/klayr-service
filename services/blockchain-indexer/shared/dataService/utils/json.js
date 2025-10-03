const JSONParseDB = obj => {
	if (typeof obj === 'string') {
		return JSON.parse(obj);
	}
	return obj;
};

module.exports = { JSONParseDB };
