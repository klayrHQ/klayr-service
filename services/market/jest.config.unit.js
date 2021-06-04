// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
	// The directory where Jest should output its coverage files
	coverageDirectory: 'test/coverage',

	// The test environment that will be used for testing
	testEnvironment: 'node',

	// The glob patterns Jest uses to detect test files
	testMatch: [
		'**/tests/unit/?(*.)+(spec|test).[tj]s?(x)',
	],
};
