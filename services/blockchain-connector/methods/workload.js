const { getWorkloadScore } = require('../shared/workload');

module.exports = [
	{
		name: 'workload',
		controller: getWorkloadScore,
		params: {},
	},
];
