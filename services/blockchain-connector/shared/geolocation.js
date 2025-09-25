/*
 * Klayrhq/klayrservice
 * Copyright © 2020 Lisk Foundation
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
const geoip = require('geoip-lite');
const countries = require('i18n-iso-countries');
const dns = require('dns').promises;

// Load English names for country codes
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

async function getLocation(ip) {
	const geo = geoip.lookup(ip);

	if (!geo) {
		return { error: 'IP not found in database' };
	}

	let hostname = null;
	try {
		const result = await dns.reverse(ip);
		hostname = result[0];
	} catch {
		hostname = null;
	}

	return {
		countryCode: geo.country,
		countryName: countries.getName(geo.country, 'en'),
		hostname,
		ip,
		latitude: geo.ll[0],
		longitude: geo.ll[1],
	};
}

module.exports = {
	getLocation,
};
