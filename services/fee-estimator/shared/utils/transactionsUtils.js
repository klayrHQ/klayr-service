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
const { computeMinFee } = require('@liskhq/lisk-transactions');

const { requestConnector } = require('./request');
const { getGenesisConfig } = require('../networkConstants');

let allTransactionSchemasCache;

const getTransactionsSchemasFromCore = async () => {
	const schemas = await requestConnector('getSchema', {});
	return schemas;
};

const getAllTransactionSchemasFromCache = async () => {
	if (!allTransactionSchemasCache) {
		allTransactionSchemasCache = await getTransactionsSchemasFromCore();
	}
	return allTransactionSchemasCache;
};

const getTxnAssetSchema = async (trx) => {
	const moduleAssetId = String(trx.moduleID).concat(':').concat(trx.assetID);
	const response = await getAllTransactionSchemasFromCache();
	const allTransactionSchemas = response.transactionsAssets.map(txAsset => {
		const formattedTxAsset = {};
		formattedTxAsset.moduleAssetId = String(txAsset.moduleID).concat(':').concat(txAsset.assetID);
		formattedTxAsset.moduleAssetName = String(txAsset.moduleName).concat(':').concat(txAsset.assetName);
		formattedTxAsset.schema = txAsset.schema;
		return formattedTxAsset;
	});

	const [{ schema }] = allTransactionSchemas.filter(
		txSchema => (!moduleAssetId)
			|| txSchema.moduleAssetId === moduleAssetId,
	);
	return schema;
};

const getTxnMinFee = async (
	txn,
	getTxnAssetSchemaFn = getTxnAssetSchema,
	getGenesisConfigFn = getGenesisConfig,
) => computeMinFee(
	await getTxnAssetSchemaFn(txn),
	txn,
	{
		minFeePerByte: (await getGenesisConfigFn()).minFeePerByte,
		baseFees: (await getGenesisConfigFn()).baseFees,
		numberOfSignatures: txn.signatures.filter(s => s.length).length,
		numberOfEmptySignatures: txn.signatures.filter(s => !s.length).length,
	},
);

module.exports = {
	getTxnMinFee,
	getAllTransactionSchemasFromCache,
};