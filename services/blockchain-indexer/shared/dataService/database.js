const fs = require('fs');
const path = require('path');

const getDatabaseSchema = fileName => {
	const filePath = path.join(__dirname, '../database/schema', `${fileName}.js`);
	const isExists = fs.existsSync(filePath);
	if (!isExists) return {};

	const content = require(filePath);
	return content;
};

module.exports = { getDatabaseSchema };
