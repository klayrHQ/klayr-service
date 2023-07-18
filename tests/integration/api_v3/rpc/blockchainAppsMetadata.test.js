/*
 * LiskHQ/lisk-service
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
const config = require('../../../config');
const { CHAIN_ID_PREFIX_NETWORK_MAP } = require('../../../../services/blockchain-app-registry/config');

const {
	request,
} = require('../../../helpers/socketIoRpcRequest');

const {
	invalidParamsSchema,
	jsonRpcEnvelopeSchema,
	metaSchema,
} = require('../../../schemas/rpcGenerics.schema');

const {
	blockchainAppMetadataSchema,
} = require('../../../schemas/api_v3/blockchainAppsMetadataSchema.schema');

const wsRpcUrl = `${config.SERVICE_ENDPOINT}/rpc-v3`;
const getBlockchainAppsMetadata = async (params) => request(wsRpcUrl, 'get.blockchain.apps.meta', params);
const getNetworkStatus = async params => request(wsRpcUrl, 'get.network.status', params);

let curChainID;
let curNetwork;

describe('get.blockchain.apps.meta', () => {
	beforeAll(async () => {
		const response = await getNetworkStatus();
		curChainID = response.result.data.chainID;
		curNetwork = CHAIN_ID_PREFIX_NETWORK_MAP[curChainID.substring(0, 2)];
	});

	it('should retrieve blockchain applications off-chain metadata', async () => {
		const response = await getBlockchainAppsMetadata();
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(10);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain applications off-chain metadata with limit=5', async () => {
		const response = await getBlockchainAppsMetadata({ limit: 5 });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(5);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain applications off-chain metadata with limit=5 and offset=1', async () => {
		const response = await getBlockchainAppsMetadata({ limit: 5, offset: 1 });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(0);
		expect(result.data.length).toBeLessThanOrEqual(5);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain applications off-chain metadata with limit=5, offset=1, and sort=chainName:desc', async () => {
		const response = await getBlockchainAppsMetadata({ limit: 5, offset: 1, sort: 'chainName:desc' });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(0);
		expect(result.data.length).toBeLessThanOrEqual(5);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should return blockchain application off-chain metadata by chainID', async () => {
		const response = await getBlockchainAppsMetadata({ chainID: curChainID });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toEqual(1);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain application off-chain metadata by chainID as CSV', async () => {
		const response = await getBlockchainAppsMetadata({ chainID: `04000000,${curChainID}` });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(2);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain application off-chain metadata by CSV of chainID and network', async () => {
		const response = await getBlockchainAppsMetadata({
			chainID: `02000000,${curChainID}`,
			network: `betanet,${curNetwork}`,
		});
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(2);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain application off-chain metadata by network', async () => {
		const response = await getBlockchainAppsMetadata({ network: curNetwork });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain applications off-chain metadata by network as CSV', async () => {
		const response = await getBlockchainAppsMetadata({ network: `mainnet,testnet,${curNetwork}` });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(3);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain application off-chain metadata by chainName', async () => {
		const response = await getBlockchainAppsMetadata({ chainName: 'lisk_mainchain' });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(10);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain application off-chain metadata by displayName', async () => {
		const response = await getBlockchainAppsMetadata({ displayName: 'Lisk' });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(10);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain application off-chain metadata by search', async () => {
		const response = await getBlockchainAppsMetadata({ search: 'Lisk' });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(10);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain applications off-chain metadata by partial search', async () => {
		const response = await getBlockchainAppsMetadata({ search: 'Lis' });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(10);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain application off-chain metadata by case-insensitive search (Upper-case)', async () => {
		const response = await getBlockchainAppsMetadata({ search: 'LISK' });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(10);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should retrieve blockchain application off-chain metadata by case-insensitive search (Lower-case)', async () => {
		const response = await getBlockchainAppsMetadata({ search: 'lisk' });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(10);
		result.data.forEach(blockchainApp => expect(blockchainApp).toMap(blockchainAppMetadataSchema));
		expect(result.meta).toMap(metaSchema);
	});

	it('should return list of all default blockchain applications metadata', async () => {
		const response = await getBlockchainAppsMetadata({ isDefault: true });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(10);
		result.data.forEach(blockchainAppMetadata => expect(blockchainAppMetadata)
			.toMap(blockchainAppMetadataSchema, { isDefault: true }));
		expect(result.meta).toMap(metaSchema);
	});

	it('should return list of all non-default blockchain applications metadata', async () => {
		const response = await getBlockchainAppsMetadata({ isDefault: false });
		expect(response).toMap(jsonRpcEnvelopeSchema);
		const { result } = response;
		expect(result.data).toBeInstanceOf(Array);
		expect(result.data.length).toBeGreaterThanOrEqual(1);
		expect(result.data.length).toBeLessThanOrEqual(10);
		result.data.forEach(blockchainAppMetadata => expect(blockchainAppMetadata)
			.toMap(blockchainAppMetadataSchema, { isDefault: false }));
		expect(result.meta).toMap(metaSchema);
	});

	it('should handle invalid request param and return invalid param', async () => {
		const response = await getBlockchainAppsMetadata({ invalidParam: 'invalid' });
		expect(response).toMap(invalidParamsSchema);
	});
});
