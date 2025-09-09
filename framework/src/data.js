/*
 * Klayrhq/klayrservice
 * Copyright © 2019 Lisk Foundation
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
/* eslint-disable implicit-arrow-linebreak */
const isObject = item => !!(item !== null && typeof item === 'object');
const isProperObject = item => Object.prototype.toString.call(item) === '[object Object]';
const isEmptyArray = array => !!(Array.isArray(array) && array.length === 0);
const isEmptyObject = obj =>
	!!(
		obj !== null &&
		!Array.isArray(obj) &&
		typeof obj === 'object' &&
		Object.keys(obj).length === 0
	);
const isString = item => typeof item === 'string';

module.exports = {
	isObject,
	isProperObject,
	isEmptyArray,
	isEmptyObject,
	isString,
};
