/*
 * LiskHQ/lisk-service
 * Copyright © 2021 Lisk Foundation
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
	verbose: true,
	testMatch: [
		// '<rootDir>/api/compare_http_rpc/*.test.js',
		// '<rootDir>/api/compare_staging_mainnet/*.test.js',
		'<rootDir>/integration/api_v1/http/*.test.js',
		'<rootDir>/integration/api_v1/rpc/*.test.js',
	],
	testEnvironment: 'node',
	testTimeout: 20000,
	setupFilesAfterEnv: [
		'jest-extended',
		'<rootDir>/helpers/setupCustomMatchers.js',
	],
	watchPlugins: [
		['jest-watch-toggle-config', { setting: 'verbose' }],
		['jest-watch-toggle-config', { setting: 'bail' }],
		['jest-watch-toggle-config', { setting: 'notify' }],
		'jest-watch-typeahead/filename',
	],
};
