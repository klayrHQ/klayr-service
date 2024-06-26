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
	getNetworkStatus,
	getNetworkPeers,
	getNetworkConnectedPeers,
	getNetworkDisconnectedPeers,
	getNetworkPeersStatistics,
} = require('../shared/sdk');

module.exports = [
	{
		name: 'getNetworkStatus',
		controller: getNetworkStatus,
		params: {},
	},
	{
		name: 'getNetworkPeers',
		controller: getNetworkPeers,
		params: {},
	},
	{
		name: 'getNetworkConnectedPeers',
		controller: getNetworkConnectedPeers,
		params: {},
	},
	{
		name: 'getNetworkDisconnectedPeers',
		controller: getNetworkDisconnectedPeers,
		params: {},
	},
	{
		name: 'getNetworkPeersStatistics',
		controller: getNetworkPeersStatistics,
		params: {},
	},
];
