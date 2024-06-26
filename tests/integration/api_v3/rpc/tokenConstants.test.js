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
const { request } = require('../../../helpers/socketIoRpcRequest');

const {
	jsonRpcEnvelopeSchema,
	invalidParamsSchema,
} = require('../../../schemas/rpcGenerics.schema');

const {
	tokenConstantsSchema,
	tokenConstantsMetaSchema,
} = require('../../../schemas/api_v3/tokenConstants.schema');

const wsRpcUrl = `${config.SERVICE_ENDPOINT}/rpc-v3`;

const getTokenConstants = async params => request(wsRpcUrl, 'get.token.constants', params);

describe('get.token.constants', () => {
	it('should return token module constants', async () => {
		const response = await getTokenConstants();
		expect(response).toMap(jsonRpcEnvelopeSchema);

		const { result } = response;
		expect(result.data).toMap(tokenConstantsSchema);
		expect(result.meta).toMap(tokenConstantsMetaSchema);
	});

	it('should return invalid params when requested with invalid param', async () => {
		const response = await getTokenConstants({ invalidParam: 'invalid' });
		expect(response).toMap(invalidParamsSchema);
	});

	it('should return invalid params when requested with empty invalid param', async () => {
		const response = await getTokenConstants({ invalidParam: '' });
		expect(response).toMap(invalidParamsSchema);
	});
});
