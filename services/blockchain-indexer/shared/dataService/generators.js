/*
 * Klayrhq/klayrservice
 * Copyright © 2022 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
const { parseToJSONCompatObj } = require('../utils/parser');

const business = require('./business');
const { getAllValidators } = require('./pos/validators');
const { isSubstringInArray } = require('../utils/array');

const getGenerators = async params => {
	const generators = {
		data: [],
		meta: {},
	};

	const { offset, limit } = params;

	const generatorsList = await business.getGenerators();
	const validatorList = await getAllValidators();

	const validatorMap = new Map(validatorList.map(validator => [validator.address, validator]));
	generatorsList.forEach(generator => {
		if (
			validatorMap.has(generator.address) &&
			(!('search' in params) ||
				isSubstringInArray([generator.name, generator.address, generator.publicKey], params.search))
		) {
			const validator = validatorMap.get(generator.address);
			generators.data.push({ ...generator, status: validator.status });
		}
	});

	generators.meta.total = generators.data.length;
	generators.data = generators.data.slice(offset, offset + limit);
	generators.meta.count = generators.data.length;
	generators.meta.offset = offset;

	return parseToJSONCompatObj(generators);
};

module.exports = {
	getGenerators,
};
