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
module.exports = {
	ip: '=,string',
	port: '=,number',
	networkVersion: '=,string',
	state: '=,string',
	height: '=,number',
	chainID: '=,string',
	location: {
		countryCode: 'location.countryCode,string',
		countryName: 'location.countryName,string',
		hostname: 'location.hostname,string',
		ip: 'location.ip,string',
		latitude: 'location.latitude,string',
		longitude: 'location.longitude,string',
	},
};
