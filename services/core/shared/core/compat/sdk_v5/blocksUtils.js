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
const fs = require('fs');
const path = require('path');

const {
	Logger,
	HTTP: { request },
} = require('lisk-service-framework');

const config = require('../../../../config');

const logger = Logger();

const genesisBlockURL = config.endpoints.genesisBlock;

const genesisBlockFilePath = './shared/core/compat/sdk_v5/static/genesis.json';

const downloadGenesisBlock = async () => {
	const directoryPath = path.dirname(genesisBlockFilePath);

	// Create directory if not exists
	if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath);

	const genesisBlock = await new Promise((resolve, reject) =>
		request(genesisBlockURL)
			.then(body => {
				const genesisBlock = typeof body === 'string' ? JSON.parse(body) : body;
				return resolve(genesisBlock);
			})
			.catch(err => reject(err)),
	);

	fs.writeFileSync(genesisBlockFilePath, JSON.stringify(genesisBlock));
};

const getGenesisBlockFromFS = async () => {
	if (!fs.existsSync(genesisBlockFilePath)) await downloadGenesisBlock();

	const genesisBlock = await new Promise((resolve, reject) =>
		fs.readFile(genesisBlockFilePath, (err, data) => {
			if (err) {
				logger.error(err);
				return reject(err);
			}
			return resolve(JSON.parse(data));
		})
	);

	return genesisBlock;
};

module.exports = {
	getGenesisBlockFromFS,
};
