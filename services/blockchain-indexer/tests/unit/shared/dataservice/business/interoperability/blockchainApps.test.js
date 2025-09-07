/*
 * Klayrhq/klayrservice
 * Copyright © 2023 Lisk Foundation
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
/* eslint-disable import/no-dynamic-require */
// Hoist Logger mock before all imports to ensure it is used by all required modules
jest.mock('klayr-service-framework', () => ({
	DB: {
		MySQL: {
			getTableInstance: jest.fn(() => ({
				find: jest.fn(() => []),
				count: jest.fn(() => 0),
			})),
		},
	},
	Logger: jest.fn(() => jest.fn()),
}));
// Hoist Logger mock before all imports
jest.mock('klayr-service-framework', () => ({
	DB: {
		MySQL: {
			getTableInstance: jest.fn(() => ({
				find: jest.fn(() => []),
				count: jest.fn(() => 0),
			})),
		},
	},
	Logger: jest.fn(() => jest.fn()),
}));

const { resolve } = require('path');
const constantsPath = '../../../constants/blockchainApps';
const mockNetworkPath = resolve(
	`${__dirname}/../../../../../../shared/dataService/business/network`,
);
const mockMainchainPath = resolve(
	`${__dirname}/../../../../../../shared/dataService/business/interoperability/mainchain`,
);
const mockRequestPath = resolve(`${__dirname}/../../../../../../shared/utils/request`);
const mockBlockchainAppsPath = resolve(
	`${__dirname}/../../../../../../shared/dataService/business/interoperability/blockchainApps`,
);

describe('getBlockchainApps', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	it('should fetch and process blockchain applications', async () => {
		const {
			mockedMainchainID,
			mockedBlockchainAppsValidResponse,
			mockedEscrowedAmounts,
			mockedBlockchainAppsDatabaseRes,
			mockedNetworkStatus,
		} = require(constantsPath);

		jest.mock(mockNetworkPath, () => ({
			getNetworkStatus: jest.fn(() => mockedNetworkStatus),
		}));
		jest.mock(mockRequestPath, () => ({
			requestConnector: jest.fn(() => mockedEscrowedAmounts),
		}));
		jest.mock(mockMainchainPath, () => ({
			getMainchainID: jest.fn(() => mockedMainchainID),
		}));

		// Override getTableInstance for this test
		require('klayr-service-framework').DB.MySQL.getTableInstance = jest.fn(() => ({
			find: jest.fn(() => mockedBlockchainAppsDatabaseRes),
			count: jest.fn(() => mockedBlockchainAppsValidResponse.meta.count),
		}));

		// Clear require cache for the module under test
		delete require.cache[require.resolve(mockBlockchainAppsPath)];
		const { getBlockchainApps } = require(mockBlockchainAppsPath);
		const result = await getBlockchainApps({ limit: 10, offset: 0 });
		expect(result.data).toHaveLength(1);
		expect(result.meta.count).toBe(1);
		expect(result).toEqual(mockedBlockchainAppsValidResponse);
	});

	it('should throw an error if the database is not reachable', async () => {
		const {
			mockedMainchainID,
			mockedBlockchainAppsValidResponse,
			mockedEscrowedAmounts,
			mockedNetworkStatus,
		} = require(constantsPath);

		jest.mock(mockNetworkPath, () => ({
			getNetworkStatus: jest.fn(() => mockedNetworkStatus),
		}));

		jest.mock(mockRequestPath, () => ({
			requestConnector: jest.fn(() => mockedEscrowedAmounts),
		}));

		jest.mock(mockMainchainPath, () => ({
			getMainchainID: jest.fn(() => mockedMainchainID),
		}));

		// Override getTableInstance for this test
		require('klayr-service-framework').DB.MySQL.getTableInstance = jest.fn(() => ({
			find: jest.fn(() => {
				throw Error('Database not reachable');
			}),
			count: jest.fn(() => mockedBlockchainAppsValidResponse.meta.count),
		}));

		const { getBlockchainApps } = require(mockBlockchainAppsPath);
		await expect(getBlockchainApps({ limit: 10, offset: 0 })).rejects.toThrow();
	});

	it('should throw an error if network status is not reachable', async () => {
		const {
			mockedMainchainID,
			mockedBlockchainAppsValidResponse,
			mockedBlockchainAppsDatabaseRes,
			mockedEscrowedAmounts,
		} = require(constantsPath);

		jest.mock(mockNetworkPath, () => ({
			getNetworkStatus: jest.fn(() => {
				throw Error('Network status not reachable');
			}),
		}));

		jest.mock(mockRequestPath, () => ({
			requestConnector: jest.fn(() => mockedEscrowedAmounts),
		}));

		jest.mock(mockMainchainPath, () => ({
			getMainchainID: jest.fn(() => mockedMainchainID),
		}));

		// Override getTableInstance for this test
		require('klayr-service-framework').DB.MySQL.getTableInstance = jest.fn(() => ({
			find: jest.fn(() => mockedBlockchainAppsDatabaseRes),
			count: jest.fn(() => mockedBlockchainAppsValidResponse.meta.count),
		}));

		const { getBlockchainApps } = require(mockBlockchainAppsPath);
		await expect(getBlockchainApps({ limit: 10, offset: 0 })).rejects.toThrow();
	});

	it('should throw an error if the connector is not reachable', async () => {
		const {
			mockedMainchainID,
			mockedBlockchainAppsValidResponse,
			mockedBlockchainAppsDatabaseRes,
			mockedNetworkStatus,
		} = require(constantsPath);

		jest.mock(mockNetworkPath, () => ({
			getNetworkStatus: jest.fn(() => mockedNetworkStatus),
		}));
		jest.mock(mockRequestPath, () => ({
			requestConnector: jest.fn(() => {
				throw Error('Connector not reachable');
			}),
		}));
		jest.mock(mockMainchainPath, () => ({
			getMainchainID: jest.fn(() => mockedMainchainID),
		}));

		// Override getTableInstance for this test
		require('klayr-service-framework').DB.MySQL.getTableInstance = jest.fn(() => ({
			find: jest.fn(() => mockedBlockchainAppsDatabaseRes),
			count: jest.fn(() => mockedBlockchainAppsValidResponse.meta.count),
		}));

		// Clear require cache for the module under test
		delete require.cache[require.resolve(mockBlockchainAppsPath)];
		const { getBlockchainApps } = require(mockBlockchainAppsPath);
		await expect(getBlockchainApps({ limit: 10, offset: 0 })).rejects.toThrow();
	});
});

describe('getKLYTokenID', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();
	});

	it('should generate the token ID based on the mainchain ID', async () => {
		const { mockedMainchainID } = require(constantsPath);
		jest.mock(mockMainchainPath, () => ({
			getMainchainID: jest.fn(() => mockedMainchainID),
		}));

		const { getKLYTokenID } = require(mockBlockchainAppsPath);
		await expect(getKLYTokenID()).resolves.not.toThrow();
	});

	it('should throw an error if MainchainID is not found', async () => {
		jest.mock(mockMainchainPath, () => ({
			getMainchainID: jest.fn(() => {
				throw Error('MainchainID not found');
			}),
		}));

		const { getKLYTokenID } = require(mockBlockchainAppsPath);
		await expect(getKLYTokenID()).rejects.toThrow();
	});
});
