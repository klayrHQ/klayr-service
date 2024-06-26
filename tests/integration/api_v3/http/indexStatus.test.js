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
const config = require('../../../config');
const { api } = require('../../../helpers/api');

const { badRequestSchema } = require('../../../schemas/httpGenerics.schema');

const { goodResponseSchema } = require('../../../schemas/api_v3/indexStatus.schema');

const baseUrl = config.SERVICE_ENDPOINT;
const baseUrlV3 = `${baseUrl}/api/v3`;
const endpoint = `${baseUrlV3}/index/status`;

describe('Index Status API', () => {
	it('should return index status', async () => {
		const response = await api.get(endpoint);
		expect(response).toMap(goodResponseSchema);
	});

	it('should return bad request for unsupported param', async () => {
		const response = await api.get(`${endpoint}?invalidParam=invalid`, 400);
		expect(response).toMap(badRequestSchema);
	});

	it('should return bad request for empty param', async () => {
		const response = await api.get(`${endpoint}?someParam=`, 400);
		expect(response).toMap(badRequestSchema);
	});
});
