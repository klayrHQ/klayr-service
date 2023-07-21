/*
 * LiskHQ/lisk-service
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

const {
	FileSystem: { createDir, exists },
	Logger,
	Exceptions: { NotFoundException },
} = require('lisk-service-framework');

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const util = require('util');
const crypto = require('crypto');
const config = require('../../config');
const execInShell = util.promisify(require('child_process').exec);
const { requestConnector } = require('./request');

const logger = Logger();

let snapshotFilePath = './data/service-snapshot.sql';

const getHTTPProtocolByURL = (url) => url.startsWith('https') ? https : http;

const checkCommandAvailability = async () => {
	const { stdout: mysqlAvailable } = await execInShell('which mysql').catch(() => ({}));
	if (!mysqlAvailable) throw new NotFoundException('mysql command is unavailable in PATH.');
};

const calculateSHA256 = async (file) => new Promise((resolve, reject) => {
	const hash = crypto.createHash('sha256');
	const stream = fs.createReadStream(file);

	stream.on('data', (data) => hash.update(data));
	stream.on('end', () => resolve(hash.digest('hex')));
	stream.on('error', (error) => reject(error));
});

const downloadUnzipAndVerifyChecksum = async (fileUrl, filePath) => {
	const checksumUrl = fileUrl.replace('.gz', '.SHA256');

	return new Promise((resolve, reject) => {
		// Download the checksum file
		logger.info('Attempting to download the snapshot checksum.');
		getHTTPProtocolByURL(checksumUrl).get(checksumUrl, (response) => {
			if (response.statusCode === 200) {
				let checksumData = '';

				response.on('data', (chunk) => {
					checksumData += chunk;
				});

				response.on('end', () => {
					// Extract the SHA256 hash from the downloaded data
					const checksum = checksumData.trim().split(' ')[0];

					// Download and unzip the file
					logger.info('Attempting to download the snapshot file.');
					getHTTPProtocolByURL(fileUrl).get(fileUrl, (res) => {
						if (res.statusCode === 200) {
							const unzip = zlib.createUnzip();
							const writeFile = fs.createWriteStream(filePath);

							res.pipe(unzip).pipe(writeFile);

							res.on('error', (err) => {
								reject(new Error(err));
							});

							writeFile.on('finish', () => {
								// calculate hash from file.
								calculateSHA256(filePath).then((calculatedChecksum) => {
									if (calculatedChecksum === checksum) {
										resolve();
									} else {
										reject(new Error('Checksum verification failed.'));
									}
								}).catch(err => {
									reject(err);
								});
							});

							writeFile.on('error', (err) => {
								reject(err);
							});
						} else {
							const errMessage = `Download failed with HTTP status code: ${res.statusCode} (${res.statusMessage})`;
							console.error(errMessage);
							if (res.statusCode === 404) {
								reject(new Error(`NotFoundException: ${errMessage}`));
							} else {
								reject(new Error(errMessage));
							}
						}
					}).on('error', (err) => {
						reject(new Error(err));
					});
				});
			} else {
				reject(new Error('Failed to download checksum file.'));
			}
		}).on('error', (err) => {
			reject(new Error(err));
		});
	});
};

const resolveSnapshotRestoreCommand = async (connEndpoint) => {
	await checkCommandAvailability();
	const [user, password] = connEndpoint.split('//')[1].split('@')[0].split(':');
	const [host, port, database] = connEndpoint.split('@')[1].split(new RegExp('/|:', 'g'));
	const mysqlSnapshotCommand = `mysql ${database} -h ${host} -P ${port} -u ${user} -p${password} < ${snapshotFilePath}`;
	return mysqlSnapshotCommand;
};

const applySnapshot = async (connEndpoint = config.endpoints.mysql) => {
	try {
		logger.debug('Attempting to resolve the snapshot command.');
		const snapshotRestoreCommand = await resolveSnapshotRestoreCommand(connEndpoint);
		logger.info(`Attempting to apply the snapshot file available at: ${snapshotFilePath}.`);
		const { stdout, stderr } = await execInShell(snapshotRestoreCommand);
		logger.info(stdout);
		logger.warn(stderr);
		logger.info('SQL file(s) imported successfully.');
	} catch (error) {
		logger.error(error.stack);
		throw error;
	}
};

const downloadSnapshot = async (snapshotUrl) => {
	const directoryPath = path.dirname(snapshotFilePath);
	if (!(await exists(directoryPath))) await createDir(directoryPath, { recursive: true });
	await downloadUnzipAndVerifyChecksum(snapshotUrl, snapshotFilePath);
};

const initSnapshot = async () => {
	if (config.snapshot.enable !== true) {
		logger.info('Index snapshot application has been disabled.');
		return;
	}

	const { chainID } = await requestConnector('getNetworkStatus');
	const network = config.networks.LISK
		.filter(networkInfo => networkInfo.chainID === chainID)[0];

	snapshotFilePath = `./data/${network.name}/service-snapshot.sql`;
	let { snapshotUrl } = network;

	if (config.snapshot.url) {
		// Override if custom snapshot URL is specified
		snapshotUrl = config.snapshot.url;
	} else if (!snapshotUrl) {
		logger.warn(`Cannot apply snapshot. Snapshot URL for network (${network.name}) is unavailable.\nTry updating the config file or setting the 'INDEX_SNAPSHOT_URL' environment variable.`);
		return;
	}

	if (!snapshotUrl.startsWith('https') && !config.snapshot.allowInsecureHttp) {
		throw new Error(`Please consider using a secured source (HTTPS). To continue to download snapshot from ${snapshotUrl}, set 'ENABLE_SNAPSHOT_ALLOW_INSECURE_HTTP' env variable.`);
	}

	await downloadSnapshot(snapshotUrl);
	await applySnapshot();
};

module.exports = {
	initSnapshot,
	applySnapshot,
};
