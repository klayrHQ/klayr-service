const logger = require('klayr-service-framework').Logger();
const { scheduleMissingBlocksIndexing } = require('../shared/scheduler');

module.exports = [
	{
		name: 'scheduleMissingBlocksIndexing',
		controller: async () => {
			setTimeout(async () => {
				try {
					logger.debug('Attempting to schedule indexing for the missing blocks.');
					await scheduleMissingBlocksIndexing();
				} catch (err) {
					logger.warn(`Failed to schedule missing blocks indexing due to: ${err.message}`);
					logger.trace(err.stack);
				}
			}, 0);
		},
		params: {},
	},
];
