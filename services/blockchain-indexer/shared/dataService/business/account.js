const BluebirdPromise = require('bluebird');
const {
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const { getAccountKnowledge } = require('../knownAccounts');

const config = require('../../../config');
const accountsTableSchema = require('../../database/schema/accounts');
const tokenAccountTableSchema = require('../../database/schema/tokenAccount');
const tokenBalancesTableSchema = require('../../database/schema/tokenBalances');
const authTableSchema = require('../../database/schema/auth');
const { getKlayr32AddressFromPublicKey } = require('../../utils/account');
const { getAddressByName } = require('../utils/validator');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getAccountsTable = () => getTableInstance(accountsTableSchema, MYSQL_ENDPOINT);
const getTokenAccountTable = () => getTableInstance(tokenAccountTableSchema, MYSQL_ENDPOINT);
const getTokenBalancesTable = () => getTableInstance(tokenBalancesTableSchema, MYSQL_ENDPOINT);
const getAuthTable = () => getTableInstance(authTableSchema, MYSQL_ENDPOINT);

const MAX_CONCURRENCY = 16;

const getTotalAccounts = async () => {
	const tokenAccountTable = await getTokenAccountTable();
	const total = Number(await tokenAccountTable.count());
	return total;
};

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

		const address = getKlayr32AddressFromPublicKey(publicKey);

		// Return empty response if user specified address and publicKey pair does not match
		if (params.address && !params.address.split(',').includes(address)) {
			return account;
		}

		addressSet.add(address);

		// Index publicKey asynchronously
		indexAccountPublicKey(publicKey);
	}

	if (params.address) {
		const { address, ...restParams } = params;
		params = restParams;

		const addresses = address.split(',');
		for (let i = 0; i < addresses.length; i++) {
			addressSet.add(addresses[i]);
		}
	}

	if (params.name) {
		const { name, ...restParams } = params;
		params = restParams;

		const names = name.split(',');
		for (let i = 0; i < names.length; i++) {
			const address = await getAddressByName(names[i]);
			if (address) addressSet.add(address);
		}
	}

	if (addressSet.size > 0) {
		params.whereIn = { property: 'address', values: Array.from(addressSet) };
	}

	const tokenAccountTable = await getTokenAccountTable();

	const tokenAccountData = await tokenAccountTable.find(
		params,
		Object.getOwnPropertyNames(tokenAccountTableSchema.schema),
	);
	const total = Number(await tokenAccountTable.count(params));

	if (total > 0) {
		const tokenBalancesTable = await getTokenBalancesTable();
		const authTable = await getAuthTable();
		const accountsTable = await getAccountsTable();

		const addressList = tokenAccountData.map(t => t.address);

		const [tokenBalancesData, authData, accountsData] = await Promise.all([
			tokenBalancesTable.find(
				{ whereIn: { property: 'address', values: addressList } },
				Object.getOwnPropertyNames(tokenBalancesTableSchema.schema),
			),
			authTable.find(
				{ whereIn: { property: 'address', values: addressList } },
				Object.getOwnPropertyNames(authTableSchema.schema),
			),
			accountsTable.find(
				{ whereIn: { property: 'address', values: addressList } },
				Object.getOwnPropertyNames(accountsTableSchema.schema),
			),
		]);

		await BluebirdPromise.map(
			tokenAccountData,
			async acc => {
				const tokenBalances = [];
				for (let i = 0; i < tokenBalancesData.length; i++) {
					if (tokenBalancesData[i].address === acc.address) {
						tokenBalances.push({
							tokenID: tokenBalancesData[i].tokenID,
							totalBalance: tokenBalancesData[i].balance.toString(),
							availableBalance: tokenBalancesData[i].availableBalance.toString(),
							lockedBalance: (
								BigInt(tokenBalancesData[i].balance) - BigInt(tokenBalancesData[i].availableBalance)
							).toString(),
						});
					}
				}

				let authInfo;
				for (let i = 0; i < authData.length; i++) {
					if (authData[i].address === acc.address) {
						authInfo = authData[i];
						break;
					}
				}

				let accountInfo;
				for (let i = 0; i < accountsData.length; i++) {
					if (accountsData[i].address === acc.address) {
						accountInfo = accountsData[i];
						break;
					}
				}

				const knowledge = getAccountKnowledge(acc.address);
				const description =
					knowledge && knowledge.owner && knowledge.description
						? `${knowledge.owner}'s ${knowledge.description}`
						: '';

				account.data.push({
					address: acc.address,
					publicKey: accountInfo ? accountInfo.publicKey : '',
					name: accountInfo ? accountInfo.name : '',
					nonce: authInfo ? authInfo.nonce : '0',
					description,
					tokenBalances,
				});
			},
			{ concurrency: Math.min(tokenAccountData.length, MAX_CONCURRENCY) },
		);
	}

	account.meta = {
		count: tokenAccountData.length,
		offset: params.offset,
		total,
	};

	return account;
};

module.exports = { getAccount, getTotalAccounts };
