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
/* eslint-disable operator-linebreak */
const BullQueue = require('bull');

const loggerLib = require('./logger');

const logger = loggerLib.get();

const packageJson = require('../package.json');

const queuePool = {};

const STATS_INTERVAL = 1 * 60 * 1000; // ms

const defaultOptions = {
	defaultJobOptions: {
		attempts: 5,
		timeout: 5 * 60 * 1000, // ms
		removeOnComplete: true,
		removeOnFail: true,
		stackTraceLimit: 0,
	},
	settings: {},
};

const queueInstance = (
	redisEndpoint,
	_queueName = 'defaultQueue',
	jobFn,
	concurrency = 1,
	options = defaultOptions,
) => {
	const queueName = _queueName || 'defaultQueue';

	if (!queuePool[queueName]) {
		queuePool[queueName] = new BullQueue(queueName, redisEndpoint, {
			prefix: `queue-${packageJson.name}`,
			defaultJobOptions: options.defaultJobOptions,
			settings: options.settings,
			limiter: options.limiter,
		});

		const queue = queuePool[queueName];

		logger.info(`Initialized queue ${queueName}`);

		queue.on('completed', job => {
			logger.debug(`${job.name} job completed.`);
			job.remove();
		});

		queue.on('error', err => {
			logger.error(`${queue.name} job error:\n${JSON.stringify(err, null, '\t')}`);
		});

		queue.on('failed', (job, err) => {
			const validationMessageString =
				err.message === 'Parameters validation error!'
					? String('\n\t- ').concat(err.data.map(e => e.message).join('\n\t- '))
					: '';
			logger.warn(`${job.name} job failed with error: ${err.message}${validationMessageString}`);
			logger.debug(`${job.name} job failed with error:\n${err.stack}`);
		});

		setInterval(async () => {
			const jc = await queue.getJobCounts();
			if (
				Number(jc.waiting) > 0 ||
				Number(jc.active) > 0 ||
				Number(jc.failed) > 0 ||
				Number(jc.paused) > 0
			) {
				logger.info(
					`Queue counters (${queue.name}): waiting: ${jc.waiting}, active: ${jc.active}, failed: ${jc.failed}, paused: ${jc.paused}.`,
				);
			} else {
				logger.info(`Queue counters (${queue.name}): All scheduled jobs are done.`);
			}
		}, STATS_INTERVAL);
	}

	const queue = queuePool[queueName];

	const jobName = queueName;
	queue.process(jobName, concurrency, jobFn);

	const add = params => queue.add(jobName, params);

	return {
		add,
		queue,
		pause: queue.pause,
		resume: queue.resume,
	};
};

module.exports = queueInstance;
