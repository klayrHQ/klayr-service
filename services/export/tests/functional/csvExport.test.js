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
const {
	standardizeIntervalFromParams,
	getCsvFilenameFromParams,
	getCsvFileUrlFromParams,
} = require('../../shared/csvExport');

const { interval } = require('../constants/csvExport');

const config = require('../../config');

describe('CSV export utils', () => {
	const standardizedIntervalRegex = /^\b((\d{4})-((1[012])|(0?[1-9]))-(([012][1-9])|([123]0)|31)):((\d{4})-((1[012])|(0?[1-9]))-(([012][1-9])|([123]0)|31))\b$/g;
	const csvFileNameRegex = /^\btransactions_(lsk[a-hjkm-z2-9]{38})_((\d{4})-((1[012])|(0?[1-9]))-(([012][1-9])|([123]0)|31))_((\d{4})-((1[012])|(0?[1-9]))-(([012][1-9])|([123]0)|31))\.csv\b$/g;
	const csvFileUrlRegex = /^^\/api\/v3\/export\/download\?filename=transactions_(lsk[a-hjkm-z2-9]{38})_((\d{4})-((1[012])|(0?[1-9]))-(([012][1-9])|([123]0)|31))_((\d{4})-((1[012])|(0?[1-9]))-(([012][1-9])|([123]0)|31))\.csv$/g;
	const address = 'lskeqretdgm6855pqnnz69ahpojk5yxfsv2am34et';
	const publicKey = 'b7fdfc991c52ad6646159506a8326d4203c868bd3f16b8043c8e4e034346e581';
	const csvFilenameExtension = '.csv';
	const csvFileUrlBeginsWith = '/api/v3/export/';

	describe('Test standardizeIntervalFromParams method', () => {
		it(`should return interval in standard format: '${config.csv.dateFormat}:${config.csv.dateFormat}'`, async () => {
			const result = await standardizeIntervalFromParams({ interval: interval.startEnd });
			expect(typeof result).toBe('string');
			expect(result.length).toBe((2 * config.csv.dateFormat.length) + 1);
			expect(result).toMatch(standardizedIntervalRegex);
		});

		it('should return standardized interval when both start and end date supplied', async () => {
			const result = await standardizeIntervalFromParams({ interval: interval.startEnd });
			expect(typeof result).toBe('string');
			expect(result.length).toBe((2 * config.csv.dateFormat.length) + 1);
			expect(result).toMatch(standardizedIntervalRegex);
		});

		it('should return standardized interval when only start date supplied', async () => {
			const result = await standardizeIntervalFromParams({ interval: interval.onlyStart });
			expect(typeof result).toBe('string');
			expect(result.length).toBe((2 * config.csv.dateFormat.length) + 1);
			expect(result).toMatch(standardizedIntervalRegex);
		});

		xit('should return standardized interval when dates not supplied', async () => {
			const result = await standardizeIntervalFromParams({});
			expect(typeof result).toBe('string');
			expect(result.length).toBe((2 * config.csv.dateFormat.length) + 1);
			expect(result).toMatch(standardizedIntervalRegex);
		});
	});

	describe('Test getCsvFilenameFromParams method', () => {
		it('should return csv filename when called with address and complete interval with start and end date supplied', async () => {
			const params = { address, interval: interval.startEnd };
			const csvFilename = await getCsvFilenameFromParams(params);
			expect(csvFilename.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilename).toContain(address);
			expect(csvFilename).toMatch(csvFileNameRegex);
		});

		it('should return csv filename when called with publicKey and complete interval with start and end date supplied', async () => {
			const params = { publicKey, interval: interval.startEnd };
			const csvFilename = await getCsvFilenameFromParams(params);
			expect(csvFilename.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilename).toContain(address);
			expect(csvFilename).toMatch(csvFileNameRegex);
		});

		it('should return csv filename when called with address and interval with only start date supplied', async () => {
			const params = { address, interval: interval.onlyStart };
			const csvFilename = await getCsvFilenameFromParams(params);
			expect(csvFilename.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilename).toContain(address);
			expect(csvFilename).toMatch(csvFileNameRegex);
		});

		it('should return csv filename when called with publicKey and interval with only start date supplied', async () => {
			const params = { publicKey, interval: interval.onlyStart };
			const csvFilename = await getCsvFilenameFromParams(params);
			expect(csvFilename.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilename).toContain(address);
			expect(csvFilename).toMatch(csvFileNameRegex);
		});

		xit('should return csv filename when called with address and no interval supplied', async () => {
			const params = { address };
			const csvFilename = await getCsvFilenameFromParams(params);
			expect(csvFilename.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilename).toContain(address);
			expect(csvFilename).toMatch(csvFileNameRegex);
		});

		xit('should return csv filename when called with publicKey and no interval supplied', async () => {
			const params = { publicKey };
			const csvFilename = await getCsvFilenameFromParams(params);
			expect(csvFilename.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilename).toContain(address);
			expect(csvFilename).toMatch(csvFileNameRegex);
		});
	});

	describe('Test getCsvFileUrlFromParams method', () => {
		it('should return csv filpath URL when called with address and complete interval with start and end date supplied', async () => {
			const params = { address, interval: interval.startEnd };
			const csvFilepathUrl = await getCsvFileUrlFromParams(params);
			expect(csvFilepathUrl.startsWith(csvFileUrlBeginsWith)).toBeTruthy();
			expect(csvFilepathUrl.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilepathUrl).toContain(address);
			expect(csvFilepathUrl).toMatch(csvFileUrlRegex);
		});

		it('should return csv filpath URL when called with publicKey and complete interval with start and end date supplied', async () => {
			const params = { publicKey, interval: interval.startEnd };
			const csvFilepathUrl = await getCsvFileUrlFromParams(params);
			expect(csvFilepathUrl.startsWith(csvFileUrlBeginsWith)).toBeTruthy();
			expect(csvFilepathUrl.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilepathUrl).toContain(address);
			expect(csvFilepathUrl).toMatch(csvFileUrlRegex);
		});

		it('should return csv filpath URL when called with address and interval with only start date supplied', async () => {
			const params = { address, interval: interval.onlyStart };
			const csvFilepathUrl = await getCsvFileUrlFromParams(params);
			expect(csvFilepathUrl.startsWith(csvFileUrlBeginsWith)).toBeTruthy();
			expect(csvFilepathUrl.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilepathUrl).toContain(address);
			expect(csvFilepathUrl).toMatch(csvFileUrlRegex);
		});

		it('should return csv filpath URL when called with publicKey and interval with only start date supplied', async () => {
			const params = { publicKey, interval: interval.onlyStart };
			const csvFilepathUrl = await getCsvFileUrlFromParams(params);
			expect(csvFilepathUrl.startsWith(csvFileUrlBeginsWith)).toBeTruthy();
			expect(csvFilepathUrl.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilepathUrl).toContain(address);
			expect(csvFilepathUrl).toMatch(csvFileUrlRegex);
		});

		xit('should return csv filpath URL when called with address and no interval supplied', async () => {
			const params = { address };
			const csvFilepathUrl = await getCsvFileUrlFromParams(params);
			expect(csvFilepathUrl.startsWith(csvFileUrlBeginsWith)).toBeTruthy();
			expect(csvFilepathUrl.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilepathUrl).toContain(address);
			expect(csvFilepathUrl).toMatch(csvFileUrlRegex);
		});

		xit('should return csv filpath URL when called with publicKey and no interval supplied', async () => {
			const params = { publicKey };
			const csvFilepathUrl = await getCsvFileUrlFromParams(params);
			expect(csvFilepathUrl.startsWith(csvFileUrlBeginsWith)).toBeTruthy();
			expect(csvFilepathUrl.endsWith(csvFilenameExtension)).toBeTruthy();
			expect(csvFilepathUrl).toContain(address);
			expect(csvFilepathUrl).toMatch(csvFileUrlRegex);
		});
	});
});
