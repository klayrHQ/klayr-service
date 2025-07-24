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
const { EVENT_NAME_COMMAND_EXECUTION_RESULT } = require('./constants/names');

let schemas;
let metadata;
const eventSchemaLookup = {};

const setSchemas = _schemas => (schemas = _schemas);

const getAccountSchema = () => schemas.account;

const getBlockSchema = () => schemas.block;

const getBlockHeaderSchema = () => schemas.header;

const getBlockAssetSchema = () => schemas.asset;

const getEventSchema = () => schemas.event;

const getTransactionSchema = () => schemas.transaction;

const getCCMSchema = () => schemas.ccm;

const getTransactionParamsSchema = transaction => {
	const moduleMetadata = metadata.modules.find(m => m.name === transaction.module);
	const { params: schema } = moduleMetadata.commands.find(c => c.name === transaction.command);
	return schema;
};

const setMetadata = _metadata => (metadata = _metadata);

const getBlockAssetDataSchemaByModule = _module => {
	const moduleMetadata = metadata.modules.find(m => m.name === _module);
	if (moduleMetadata === undefined) return undefined;

	const [{ data: schema } = {}] = moduleMetadata.assets;
	return schema;
};

const getDataSchemaByEvent = event => {
	if (EVENT_NAME_COMMAND_EXECUTION_RESULT === event.name) return schemas.standardEvent;

	// Populate the eventSchemaLookup map with module events if not exists
	if (Object.keys(eventSchemaLookup).length === 0) {
		for (let i = 0; i < metadata.modules.length; i++) {
			const module = metadata.modules[i];
			for (let j = 0; j < module.events.length; j++) {
				eventSchemaLookup[`${module.name}_${module.events[j].name}`] = module.events[j].data;
			}
		}
	}

	return eventSchemaLookup[`${event.module}_${event.name}`] || null;
};

module.exports = {
	setSchemas,
	setMetadata,

	getAccountSchema,
	getBlockSchema,
	getBlockHeaderSchema,
	getBlockAssetSchema,
	getBlockAssetDataSchemaByModule,
	getEventSchema,
	getTransactionSchema,
	getTransactionParamsSchema,
	getDataSchemaByEvent,
	getCCMSchema,
};
