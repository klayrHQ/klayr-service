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
const Queue = require('../../src/queue');

jest.spyOn(globalThis, 'setInterval').mockImplementation(() => {});

jest.mock('bull', () => {
	return jest.fn((_queueName, _endpoint, _options) => ({
		process: jest.fn(),
		on: jest.fn(),
		add: jest.fn((_jobName, data) => Promise.resolve({ id: 'jobId', data })),
		pause: jest.fn(() => Promise.resolve()),
		resume: jest.fn(() => Promise.resolve()),
		close: jest.fn(() => Promise.resolve()),
		client: {
			options: {
				host: '',
				port: 0,
			},
		},
	}));
});

describe('Test queue', () => {
	let queue;
	const redisEndpoint = process.env.REDIS_URL || 'redis://klayr:password@127.0.0.1:6379/0';

	it('should create a queue with a given redis instance', async () => {
		const testFunc = async (a, b) => a + b;
		queue = Queue(redisEndpoint, 'testQueue', testFunc, 1);

		expect(queue).toEqual({
			resume: expect.any(Function),
			pause: expect.any(Function),
			add: expect.any(Function),
			queue: expect.any(Object),
		});

		// Use the actual host and port from the queue instance for assertion
		const actualHost = queue.queue.client.options.host;
		const actualPort = queue.queue.client.options.port;
		expect(actualHost).toBeDefined();
		expect(actualPort).toBeDefined();
	});

	it('should add a job to the queue', async () => {
		const data = { a: 1, b: 2 };
		await queue.add(data).then(job => {
			expect(job.id).not.toBe(undefined);
			expect(job.data).toEqual(data);
		});
	});
});
