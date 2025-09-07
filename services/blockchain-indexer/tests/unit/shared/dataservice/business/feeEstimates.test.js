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
const { resolve } = require('path');
const { defaultFeeEstimates } = require('../../../../../shared/dataService/business/feeEstimates');

const mockFeeEstimatesFilePath = resolve(
	`${__dirname}/../../../../../shared/dataService/business/feeEstimates`,
);

const { requestFeeEstimator } = require('../../../../../shared/utils/request');
const { mockTxFeeEstimate } = require('../../constants/transactionEstimateFees');

jest.mock('klayr-service-framework', () => {
	const actual = jest.requireActual('klayr-service-framework');
	return {
		...actual,
		Logger: () => ({
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		}),
		DB: {
			...actual.DB,
			MySQL: {
				...actual.DB.MySQL,
				KVStore: {
					...actual.DB.MySQL.KVStore,
					getKeyValueTable: jest.fn(),
				},
			},
		},
		CacheRedis: jest.fn(),
		CacheLRU: jest.fn(),
	};
});

jest.mock('../../../../../shared/utils/request', () => ({
	requestFeeEstimator: jest.fn(() => mockTxFeeEstimate),
}));

describe('Fee estimates', () => {
	afterEach(() => {
		jest.clearAllMocks();
		jest.resetModules();
	});

	it('should assign payload to feeEstimates if payload is defined', async () => {
		// Re-require after resetModules to get fresh state
		const { getFeeEstimates, setFeeEstimates } = require(mockFeeEstimatesFilePath);

		await setFeeEstimates(mockTxFeeEstimate);
		const feeEstimates = getFeeEstimates();

		// setFeeEstimates does not call requestFeeEstimator
		expect(feeEstimates).toEqual(mockTxFeeEstimate);
	});
});

describe('Test getFeeEstimatesFromFeeEstimator', () => {
	afterEach(() => {
		jest.clearAllMocks();
		jest.resetModules();
	});

	it('should assign payload to feeEstimates if payload is defined', async () => {
		// Re-mock after resetModules
		jest.doMock('../../../../../shared/utils/request', () => ({
			requestFeeEstimator: jest.fn(() => mockTxFeeEstimate),
			getAppContext: () => ({ getBroker: () => ({ waitForServices: jest.fn() }) }),
		}));
		const { getFeeEstimatesFromFeeEstimator } = require(mockFeeEstimatesFilePath);
		const feeEstimates = await getFeeEstimatesFromFeeEstimator();

		// requestFeeEstimator should be called once
		expect(feeEstimates).toEqual(mockTxFeeEstimate);
	});

	it('should return default fee estimates when underlying api call throws error', async () => {
		// Set up error mock before requiring the module
		jest.doMock('../../../../../shared/utils/request', () => ({
			requestFeeEstimator: jest.fn(() => {
				throw new Error('Custom Error');
			}),
			getAppContext: () => ({ getBroker: () => ({ waitForServices: jest.fn() }) }),
		}));
		const {
			defaultFeeEstimates,
			getFeeEstimatesFromFeeEstimator,
		} = require(mockFeeEstimatesFilePath);
		const feeEstimates = await getFeeEstimatesFromFeeEstimator();

		expect(feeEstimates).toEqual(defaultFeeEstimates);
	});
});
