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
const {
	address: { getAddressFromKlayr32Address },
} = require('@klayr/cryptography');

const parseToJSONCompatObj = obj => {
	if (obj === null || obj === undefined) return obj;

	const t = typeof obj;

	if (t === 'boolean' || t === 'string' || t === 'number') return obj;
	if (t === 'bigint') return String(obj);
	if (Buffer.isBuffer(obj)) return obj.toString('hex');

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			obj[i] = parseToJSONCompatObj(obj[i]);
		}
		return obj;
	}

	if (t === 'object') {
		for (const k in obj) {
			if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
			const v = obj[k];
			if (Buffer.isBuffer(v)) obj[k] = v.toString('hex');
			else if (typeof v === 'bigint') obj[k] = String(v);
			else if (v && typeof v === 'object') obj[k] = parseToJSONCompatObj(v);
			else obj[k] = v;
		}
		return obj;
	}

	return obj;
};

const parseInputBySchema = (input, schema) => {
	const { type: schemaType, dataType: schemaDataType, items: schemaItemsSchema } = schema;

	if (typeof input !== 'object') {
		if (schemaDataType === 'string') return String(input);
		if (schemaDataType === 'boolean') return Boolean(input);
		if (schemaDataType === 'bytes') {
			if (schema.format === 'klayr32' && input.startsWith('kly')) {
				return getAddressFromKlayr32Address(input);
			}
			return Buffer.from(input, 'hex');
		}
		if (schemaDataType === 'uint32' || schemaDataType === 'sint32') return Number(input);
		if (schemaDataType === 'uint64' || schemaDataType === 'sint64') return BigInt(input);
		return input;
	}

	if (schemaType === 'object') {
		const formattedObj = Object.keys(input).reduce((acc, key) => {
			const { type, dataType, items: itemsSchema, format } = schema.properties[key] || {};
			const currValue = input[key];
			if (type === 'array') {
				acc[key] = currValue.map(item => parseInputBySchema(item, itemsSchema));
			} else {
				const innerSchema =
					typeof currValue === 'object' ? schema.properties[key] : { dataType, format };
				acc[key] = parseInputBySchema(currValue, innerSchema);
			}
			return acc;
		}, {});
		return formattedObj;
	}
	if (schemaType === 'array') {
		const formattedArray = input.map(item => parseInputBySchema(item, schemaItemsSchema));
		return formattedArray;
	}

	// For situations where the schema for a property states 'bytes'
	// but has already been de-serialized into object, e.g. tx.asset
	return input;
};

module.exports = {
	parseToJSONCompatObj,
	parseInputBySchema,
};
