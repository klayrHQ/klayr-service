/*
 * Klayrhq/klayrservice
 * Copyright © 2019 Lisk Foundation
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
const { init, get, debug, getConfig } = require('../../src/logger');

describe('Logger', () => {
	const defaultLogLevel = process.env.SERVICE_LOG_LEVEL;

	beforeEach(() => {
		// Reset the logger config before each test
		init({
			name: 'test-runner',
			level: defaultLogLevel,
		});
	});

	it('should export init, get, debug, getConfig', () => {
		expect(init).toBeInstanceOf(Function);
		expect(get).toBeInstanceOf(Function);
		expect(debug).toBeInstanceOf(Function);
		expect(getConfig).toBeInstanceOf(Function);
	});

	describe('Logger configuration', () => {
		it('should have a default configuration', () => {
			const config = getConfig();
			expect(config).toBeInstanceOf(Object);
			expect(config.appenders).toBeInstanceOf(Object);
			expect(config.categories).toBeInstanceOf(Object);
			expect(config.categories.default).toBeInstanceOf(Object);
		});

		it('should update configuration with init for console', () => {
			const newConfig = {
				name: 'test-logger',
				level: 'warn',
				console: 'true',
			};
			init(newConfig);
			const config = getConfig();
			expect(config.categories.default.level).toBe('warn');
			expect(config.appenders).toHaveProperty('console');
			expect(config.appenders).toHaveProperty('console_filter');
			expect(config.categories.default.appenders).toContain('console_filter');
		});

		it('should update configuration with init for stdout', () => {
			const newConfig = {
				name: 'test-logger',
				level: 'info',
				stdout: 'true',
			};
			init(newConfig);
			const config = getConfig();
			expect(config.categories.default.level).toBe('info');
			expect(config.appenders).toHaveProperty('stdout');
			expect(config.appenders).toHaveProperty('stdout_filter');
			expect(config.categories.default.appenders).toContain('stdout_filter');
		});

		it('should update configuration with init for file', () => {
			const newConfig = {
				name: 'test-logger',
				level: 'error',
				file: './logs/test.log',
			};
			init(newConfig);
			const config = getConfig();
			expect(config.categories.default.level).toBe('error');
			expect(config.appenders).toHaveProperty('file');
			expect(config.appenders.file.filename).toBe('./logs/test.log');
			expect(config.categories.default.appenders).toContain('file');
		});
	});

	describe('Logger instance', () => {
		it('should return a logger instance with a name', () => {
			const log = get('test');
			expect(log).toBeInstanceOf(Object);
			expect(log.info).toBeInstanceOf(Function);
			expect(log.warn).toBeInstanceOf(Function);
			expect(log.error).toBeInstanceOf(Function);
			expect(log.debug).toBeInstanceOf(Function);
			expect(log.trace).toBeInstanceOf(Function);
			expect(log.fatal).toBeInstanceOf(Function);
		});

		it('should return a logger instance without a name (auto-detect)', () => {
			const log = get();
			expect(log).toBeInstanceOf(Object);
			expect(log.info).toBeInstanceOf(Function);
			expect(log.warn).toBeInstanceOf(Function);
			expect(log.error).toBeInstanceOf(Function);
			expect(log.debug).toBeInstanceOf(Function);
			expect(log.trace).toBeInstanceOf(Function);
			expect(log.fatal).toBeInstanceOf(Function);
		});
	});
});
