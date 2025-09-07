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
const { requestConnector } = require('../../utils/request');
const { getAuthMultiSigRegMsgSchema } = require('./auth');

let allSchemas;

const getSchemasFromNode = async () => {
	const systemMetadata = await requestConnector('getSystemMetadata');
	const schemas = await requestConnector('getSchema');
	const messageSchemas = [];

	const authMultiSigRegMsgSchema = await getAuthMultiSigRegMsgSchema();
	if (authMultiSigRegMsgSchema) messageSchemas.push(authMultiSigRegMsgSchema);

	return { schemas, systemMetadata, messageSchemas };
};

const getAllSchemas = async () => {
	if (!allSchemas) {
		allSchemas = {};
		const schemas = await getSchemasFromNode();

		// Process systemMetadata schemas
		const commandsParamsSchemas = [];
		const assetsSchemas = [];
		const eventsSchemas = [];

		const modules = schemas.systemMetadata.modules;
		for (let i = 0; i < modules.length; i++) {
			const module = modules[i];

			for (let j = 0; j < module.events.length; j++) {
				const formattedEvents = {
					module: module.name,
					name: module.events[j].name,
					schema: module.events[j].data,
				};
				eventsSchemas.push(formattedEvents);
			}

			for (let j = 0; j < module.assets.length; j++) {
				const formattedAssets = {
					module: module.name,
					version: module.assets[j].version,
					schema: module.assets[j].data,
				};
				assetsSchemas.push(formattedAssets);
			}

			for (let j = 0; j < module.commands.length; j++) {
				const formattedTxParams = {
					moduleCommand: String(module.name).concat(':', module.commands[j].name),
					schema: module.commands[j].params,
				};
				commandsParamsSchemas.push(formattedTxParams);
			}
		}

		Object.assign(allSchemas, {
			assets: assetsSchemas,
			commands: commandsParamsSchemas,
			events: eventsSchemas,
		});

		// Assign generic schemas
		const entries = Object.entries(schemas.schemas);
		for (let i = 0; i < entries.length; i++) {
			const entity = entries[i][0];
			const schema = entries[i][1];
			allSchemas[entity] = { schema };
		}

		// Assign messages schemas
		Object.assign(allSchemas, { messages: schemas.messageSchemas });
	}

	return allSchemas;
};

const getSchemas = async () => {
	const schemas = {
		data: {},
		meta: {},
	};

	const response = await getAllSchemas();
	if (response) schemas.data = response;

	return schemas;
};

module.exports = {
	getSchemas,
};
