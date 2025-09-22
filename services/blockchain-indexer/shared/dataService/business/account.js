const BluebirdPromise = require('bluebird');
const {
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const { getAccountKnowledge } = require('../knownAccounts');

const config = require('../../../config');
const accountsTableSchema = require('../../database/schema/accounts');
const tokenBalancesTableSchema = require('../../database/schema/tokenBalances');
const authTableSchema = require('../../database/schema/auth');
const { getKlayr32AddressFromPublicKey } = require('../../utils/account');
const { getAddressByName } = require('../utils/validator');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getAccountsTable = () => getTableInstance(accountsTableSchema, MYSQL_ENDPOINT);
const getTokenBalancesTable = () => getTableInstance(tokenBalancesTableSchema, MYSQL_ENDPOINT);
const getAuthTable = () => getTableInstance(authTableSchema, MYSQL_ENDPOINT);

const MAX_CONCURRENCY = 16;

const getAccount = async params => {
	const account = {
		data: [],
		meta: {
			count: 0,
			offset: 0,
			total: 0,
		},
	};

	const addressSet = new Set();

	if (params.publicKey) {
		const { publicKey, ...restParams } = params;
		params = restParams;

		const address = getKlayr32AddressFromPublicKey(params.publicKey);

		// Return empty response if user specified address and publicKey pair does not match
		if (params.address && !params.address.split(',').includes(address)) {
			return account;
		}

		addressSet.add(address);

		// Index publicKey asynchronously
		indexAccountPublicKey(params.publicKey);
	}

	if (params.address) {
		const { address, ...restParams } = params;
		params = restParams;

		const addresses = params.address.split(',');
		for (let i = 0; i < addresses.length; i++) {
			addressSet.add(addresses[i]);
		}
	}

	if (params.name) {
		const { name, ...restParams } = params;
		params = restParams;

		const names = params.name.split(',');
		for (let i = 0; i < names.length; i++) {
			const address = await getAddressByName(names[i]);
			if (address) addressSet.add(address);
		}
	}

	const accountsTable = await getAccountsTable();

	params.whereIn = { property: 'address', values: Array.from(addressSet) };

	const accountsData = await accountsTable.find(
		params,
		Object.getOwnPropertyNames(accountsTableSchema.schema),
	);
	const total = Number(await accountsTable.count(params));

	if (total > 0) {
		const tokenBalancesTable = await getTokenBalancesTable();
		const authTable = await getAuthTable();

		const addressList = accountsData.map(t => t.address);

		const [tokenBalancesData, authData] = await Promise.all([
			tokenBalancesTable.find(
				{ whereIn: { property: 'address', values: addressList } },
				Object.getOwnPropertyNames(tokenBalancesTableSchema.schema),
			),
			authTable.find(
				{ whereIn: { property: 'address', values: addressList } },
				Object.getOwnPropertyNames(authTableSchema.schema),
			),
		]);

		await BluebirdPromise.map(
			accountsData,
			async acc => {
				let tokenBalancesInfo;
				for (let i = 0; i < tokenBalancesData.length; i++) {
					if (tokenBalancesData[i].address === acc.address) {
						tokenBalancesInfo = tokenBalancesData[i];
						break;
					}
				}

				let authInfo;
				for (let i = 0; i < authData.length; i++) {
					if (authData[i].address === acc.address) {
						authInfo = authData[i];
						break;
					}
				}

				const knowledge = getAccountKnowledge(acc.address);
				const description = knowledge ? `${knowledge.owner}'s ${knowledge.description}` : undefined;

				const totalBalance = tokenBalancesInfo ? tokenBalancesInfo.balance : '0';
				const availableBalance = tokenBalancesInfo ? tokenBalancesInfo.availableBalance : '0';
				const lockedBalance = BigInt(totalBalance) - BigInt(availableBalance);

				account.data.push({
					address: acc.address,
					publicKey: acc.publicKey,
					name: acc.name,
					nonce: authInfo ? authInfo.nonce : '0',
					description,
					tokenBalances: {
						totalBalance,
						availableBalance,
						lockedBalance: lockedBalance.toString(),
					},
				});
			},
			{ concurrency: Math.min(accountsData.length, MAX_CONCURRENCY) },
		);
	}

	account.meta = {
		count: accountsData.length,
		offset: params.offset,
		total,
	};

	return account;
};

module.exports = { getAccount };
