const { getLocation } = require('../../../shared/geolocation');

describe('getLocation', () => {
	it('should return geolocation info for a known IP', async () => {
		const ip = '8.8.8.8'; // Google DNS
		const result = await getLocation(ip);

		expect(result).toHaveProperty('countryCode');
		expect(result).toHaveProperty('countryName');
		expect(result).toHaveProperty('ip', ip);
		expect(result).toHaveProperty('latitude');
		expect(result).toHaveProperty('longitude');

		// country should be US for 8.8.8.8
		expect(result.countryCode).toBe('US');
		expect(result.countryName).toBe('United States');

		// hostname may or may not exist, just check field is present
		expect(result).toHaveProperty('hostname');
	});

	it('should return error for invalid IP', async () => {
		const result = await getLocation('999.999.999.999');
		expect(result).toHaveProperty('error');
	});
});
