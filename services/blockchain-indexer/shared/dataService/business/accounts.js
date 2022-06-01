/*
 * LiskHQ/lisk-service
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
const BluebirdPromise = require('bluebird');

const {
	CacheRedis,
	Exceptions: {
		NotFoundException,
		ValidationException,
	},
	MySQL: { getTableInstance },
} = require('lisk-service-framework');

const {
	standardizeUnlockHeight,
	standardizePomHeight,
} = require('./dpos');

const { getGenesisConfig, getGenesisHeight } = require('../../constants');

const accountsIndexSchema = require('../../database/schema/accounts');
const blocksIndexSchema = require('../../database/schema/blocks');
const multisignatureIndexSchema = require('../../database/schema/multisignature');
const transactionsIndexSchema = require('../../database/schema/transactions');

const {
	validateAddress,
	validatePublicKey,
	getIndexedAccountInfo,
	getAccountsBySearch,
	getLegacyHexAddressFromPublicKey,
	getLegacyAddressFromPublicKey,
	getHexAddressFromPublicKey,
	getBase32AddressFromHex,
	getHexAddressFromBase32,
	getBase32AddressFromPublicKey,
} = require('../../utils/accountUtils');

const { requestConnector } = require('../../utils/request');

const {
	dropDuplicates,
} = require('../../utils/arrayUtils');

const {
	parseToJSONCompatObj,
} = require('../../utils/parser');

const config = require('../../../config');

const MYSQL_ENDPOINT = config.endpoints.mysql;

const getAccountsIndex = () => getTableInstance('accounts', accountsIndexSchema, MYSQL_ENDPOINT);
const getBlocksIndex = () => getTableInstance('blocks', blocksIndexSchema, MYSQL_ENDPOINT);
const getMultisignatureIndex = () => getTableInstance('multisignature', multisignatureIndexSchema, MYSQL_ENDPOINT);
const getTransactionsIndex = () => getTableInstance('transactions', transactionsIndexSchema, MYSQL_ENDPOINT);

const accountsCache = CacheRedis('accounts', config.endpoints.volatileRedis);
const legacyAccountCache = CacheRedis('legacyAccount', config.endpoints.cache);
const latestBlockCache = CacheRedis('latestBlock', config.endpoints.cache);

const getNumberOfForgers = async () => {
	const genesisConfig = await getGenesisConfig();
	return genesisConfig.activeDelegates + genesisConfig.standbyDelegates;
};

const normalizeAccount = account => {
	account.address = getBase32AddressFromHex(account.address.toString('hex'));
	account.isDelegate = !(account.dpos && !account.dpos.delegate.username);
	account.isMultisignature = !!(account.keys && account.keys.numberOfSignatures);
	account.token.balance = Number(account.token.balance);
	account.sequence.nonce = Number(account.sequence.nonce);

	if (account.dpos) account.dpos.sentVotes = account.dpos.sentVotes
		.map(vote => {
			vote.delegateAddress = getBase32AddressFromHex(vote.delegateAddress.toString('hex'));
			vote.amount = Number(vote.amount);
			return vote;
		});

	return parseToJSONCompatObj(account);
};

const getAccountsFromCore = async (params) => {
	const accounts = {
		data: [],
		meta: {},
	};
	const response = params.addresses
		? await requestConnector('getAccounts', params)
		: await requestConnector('getAccount', params);

	if (Object.getOwnPropertyNames(response).length) {
		accounts.data = [normalizeAccount(response)];
	}
	if (response.meta) accounts.meta = response.meta;
	return accounts;
};

const getAccountsFromCache = async (params) => {
	const accounts = {
		data: [],
		meta: {},
	};

	const addresses = params.addresses || [params.address];
	accounts.data = await BluebirdPromise.map(
		addresses,
		async (address) => {
			const accountString = await accountsCache.get(getBase32AddressFromHex(address));
			if (accountString) return JSON.parse(accountString);

			// Fetch account information from Core, if not present in cache
			const { data: [account] } = await getAccountsFromCore({ address });
			return account;
		},
		{ concurrency: 10 },
	);
	return accounts;
};

const getAccountsByAddress = async (addressesToIndex, isGenesisBlockAccount = false) => {
	const accounts = await BluebirdPromise.map(
		dropDuplicates(addressesToIndex),
		async address => {
			const { data: [account] } = await getAccountsFromCore({ address });
			if (isGenesisBlockAccount) account.isGenesisAccount = true;

			const accountFromDB = await getIndexedAccountInfo({ address, limit: 1 }, ['publicKey', 'isGenesisAccount']);
			if (accountFromDB) {
				if (accountFromDB.publicKey) account.publicKey = accountFromDB.publicKey;
				if (accountFromDB.isGenesisAccount) {
					account.isGenesisAccount = accountFromDB.isGenesisAccount;
				}
			}
			account.username = account.dpos.delegate.username || null;
			account.totalVotesReceived = account.dpos.delegate.totalVotesReceived;
			account.balance = account.token.balance;
			return account;
		},
		{ concurrency: 10 },
	);
	return accounts;
};

const getAccountsByPublicKey = async (accountInfoArray) => {
	const accounts = await BluebirdPromise.map(
		accountInfoArray
			.map(accountInfo => getHexAddressFromPublicKey(accountInfo.publicKey)),
		async address => {
			const { data: [account] } = await getAccountsFromCore({ address });
			const [accountInfo] = accountInfoArray
				.filter(accInfo => getBase32AddressFromPublicKey(accInfo.publicKey) === account.address);
			account.publicKey = accountInfo.publicKey;
			account.username = account.dpos.delegate.username || null;
			account.totalVotesReceived = account.dpos.delegate.totalVotesReceived;
			account.balance = account.token.balance;
			return account;
		},
		{ concurrency: 10 },
	);
	return accounts;
};

const getAccountsByPublicKey2 = async (accountInfoArray) => {
	const accounts = await BluebirdPromise.map(
		accountInfoArray
			.map(publicKey => getHexAddressFromPublicKey(publicKey)),
		async address => {
			const { data: [account] } = await getAccountsFromCore({ address });
			const [accountInfo] = accountInfoArray
				.filter(accInfo => getBase32AddressFromPublicKey(accInfo.publicKey) === account.address);
			account.publicKey = accountInfo.publicKey;
			account.username = account.dpos.delegate.username || null;
			account.totalVotesReceived = account.dpos.delegate.totalVotesReceived;
			account.balance = account.token.balance;
			return account;
		},
		{ concurrency: 10 },
	);
	return accounts;
};

const resolveAccountInfo = async accounts => BluebirdPromise.map(
	accounts,
	async account => {
		account.dpos.unlocking = await BluebirdPromise.map(
			account.dpos.unlocking
				.sort((a, b) => b - a),
			async unlock => {
				const delegateHexAddress = unlock.delegateAddress;
				unlock.delegateAddress = getBase32AddressFromHex(unlock.delegateAddress);

				let delegateAccount = account;
				if (unlock.delegateAddress !== account.address) {
					const {
						data: [delegateAcc],
					} = await getAccountsFromCache({ address: delegateHexAddress });
					delegateAccount = delegateAcc;
				}
				unlock.height = standardizeUnlockHeight(unlock, account, delegateAccount);

				return unlock;
			},
			{ concurrency: 1 },
		);
		return account;
	},
	{ concurrency: accounts.length },
);

const verifyIfPunished = async delegate => {
	const latestBlockString = await latestBlockCache.get('latestBlock');
	const latestBlock = latestBlockString ? JSON.parse(latestBlockString) : {};
	const isPunished = delegate.pomHeights
		.some(pomHeight => pomHeight.start <= latestBlock.height
			&& latestBlock.height <= pomHeight.end);
	return isPunished;
};

const resolveDelegateInfo = async accounts => {
	accounts = await BluebirdPromise.map(
		accounts,
		async account => {
			if (account.isDelegate) {
				const blocksDB = await getBlocksIndex();
				const transactionsDB = await getTransactionsIndex();
				const delegateRegTxModuleAssetId = '5:0';

				account.account = {
					address: account.address,
					publicKey: account.publicKey,
				};

				account.username = account.dpos.delegate.username;
				account.balance = account.token.balance;
				account.pomHeights = account.dpos.delegate.pomHeights
					.sort((a, b) => b - a)
					.slice(0, 5)
					.map(pomHeight => standardizePomHeight(pomHeight));

				if (account.dpos.delegate.isBanned || await verifyIfPunished(account)) {
					account.delegateWeight = BigInt('0');
				} else {
					const selfVote = account.dpos.sentVotes
						.find(vote => vote.delegateAddress === account.address);
					const selfVoteAmount = selfVote ? BigInt(selfVote.amount) : BigInt(0);
					const cap = selfVoteAmount * BigInt(10);

					account.totalVotesReceived = BigInt(account.dpos.delegate.totalVotesReceived);
					const voteWeight = BigInt(account.totalVotesReceived) > cap
						? cap
						: account.totalVotesReceived;

					account.delegateWeight = voteWeight;
				}

				const [lastForgedBlock = {}] = await blocksDB.find({
					generatorPublicKey: account.publicKey,
					sort: 'height:desc',
					limit: 1,
				}, ['height']);
				account.dpos.delegate.lastForgedHeight = lastForgedBlock.height || null;

				// Iff the COMPLETE blockchain is SUCCESSFULLY indexed
				// if (getIsSyncFullBlockchain() && getIndexReadyStatus()) {
				const accountInfo = account.publicKey
					? await getIndexedAccountInfo(
						{
							publicKey: account.publicKey,
							limit: 1,
						},
						['rewards', 'producedBlocks'],
					)
					: {};
				account.rewards = accountInfo && accountInfo.rewards
					? accountInfo.rewards
					: 0;
				account.producedBlocks = accountInfo && accountInfo.producedBlocks
					? accountInfo.producedBlocks
					: 0;

				// Check for the delegate registration transaction
				const [delegateRegTx = {}] = await transactionsDB.find(
					{
						senderPublicKey: account.publicKey,
						moduleAssetId: delegateRegTxModuleAssetId,
						limit: 1,
					},
					['height'],
				);
				account.dpos.delegate.registrationHeight = delegateRegTx.height
					? delegateRegTx.height
					: await getGenesisHeight();
				// }
			}
			return account;
		},
		{ concurrency: accounts.length },
	);

	return accounts;
};

const getLegacyAccountInfo = async ({ publicKey }) => {
	const legacyAccountInfo = {};

	// Check if the account was already migrated
	const reclaimTxModuleAssetId = '1000:0';
	const transactionsDB = await getTransactionsIndex();
	const [reclaimTx] = await transactionsDB.find({
		senderPublicKey: publicKey,
		moduleAssetId: reclaimTxModuleAssetId,
		limit: 1,
	}, ['id']);

	if (reclaimTx) {
		Object.assign(
			legacyAccountInfo,
			{
				legacyAddress: getLegacyAddressFromPublicKey(publicKey),
				isMigrated: true,
			},
		);
	} else {
		// Fetch legacy account info from the cache or query Core if unavailable
		const legacyHexAddress = getLegacyHexAddressFromPublicKey(publicKey);
		const cachedAccountInfoStr = await legacyAccountCache.get(legacyHexAddress);
		const accountInfo = cachedAccountInfoStr
			? JSON.parse(cachedAccountInfoStr)
			: await requestConnector(
				'invokeEndpoint',
				{
					endpoint: 'legacy_getLegacyAccount',
					params: { publicKey },
				},
			);

		if (accountInfo && Object.keys(accountInfo).length) {
			if (!cachedAccountInfoStr) {
				await legacyAccountCache.set(legacyHexAddress, JSON.stringify(accountInfo));
			}

			const legacyAddressBuffer = Buffer.from(accountInfo.address, 'hex');
			const legacyAddress = `${legacyAddressBuffer.readBigUInt64BE().toString()}L`;
			Object.assign(
				legacyAccountInfo,
				{
					address: getBase32AddressFromPublicKey(publicKey),
					legacyAddress: getLegacyAddressFromPublicKey(publicKey),
					publicKey,
					// The account hasn't migrated/reclaimed yet
					// So, has no outgoing transactions/registrations on the (legacy) blockchain
					isMigrated: false,
					isDelegate: false,
					isMultisignature: false,
					token: { balance: BigInt('0') },
					legacy: {
						...accountInfo,
						address: legacyAddress,
					},
				},
			);
		} else if (!cachedAccountInfoStr) {
			// Cache empty object for accounts for which core returns 'undefined'
			await legacyAccountCache.set(legacyHexAddress, JSON.stringify(legacyAccountInfo));
		}
	}
	return legacyAccountInfo;
};

const getAccounts = async params => {
	const accounts = {
		data: [],
		meta: {},
	};

	let paramPublicKey;
	let addressFromParamPublicKey;
	const accountsDB = await getAccountsIndex();

	if (params.sort && params.sort.includes('rank')) {
		throw new ValidationException('Rank based sorting is supported only for delegates');
	}

	if (params.search) {
		params.search = {
			property: 'username',
			pattern: params.search,
		};
	}

	if (params.id) {
		const { id, ...remParams } = params;
		params = remParams;
		params.address = id;
	}

	if (params.publicKey && typeof params.publicKey === 'string') {
		if (!validatePublicKey(params.publicKey)) return {};

		const { publicKey, ...remParams } = params;
		paramPublicKey = publicKey;
		addressFromParamPublicKey = getBase32AddressFromPublicKey(paramPublicKey);
		params = {
			...remParams,
			address: addressFromParamPublicKey,
		};
	}

	if (params.address && typeof params.address === 'string') {
		if (!validateAddress(params.address)) return {};
		if (!('limit' in params)) params.limit = 1;
	}

	if (params.addresses) {
		const { addresses, ...remParams } = params;
		params = remParams;
		params.whereIn = {
			property: 'address',
			values: addresses,
		};
		if (!('limit' in params)) params.limit = addresses.length;
	}

	const resultSet = await accountsDB.find(
		params,
		['address', 'publicKey', 'username', 'isGenesisAccount'],
	);
	if (resultSet.length) {
		params.addresses = resultSet.map(row => getHexAddressFromBase32(row.address));
	}

	if (params.address) {
		params.address = getHexAddressFromBase32(params.address);
		if (params.addresses) {
			const { address, ...remParams } = params;
			params = remParams;
		}
	}

	if ((params.addresses && params.addresses.length) || params.address) {
		try {
			const response = {};
			const addresses = params.addresses || [params.address];
			response.data = await BluebirdPromise.map(
				addresses,
				async address => {
					const { data: [account] } = await getAccountsFromCache({ address });
					return account;
				},
				{ concurrency: 10 },
			);
			if (response.data.length) accounts.data = response.data;
			if (params.address && 'offset' in params && params.limit) accounts.data = accounts.data.slice(params.offset, params.offset + params.limit);
		} catch (err) {
			if (!(paramPublicKey && (err instanceof NotFoundException || err.message === 'MISSING_ACCOUNT_IN_BLOCKCHAIN'))) return err;
		}
	}

	accounts.data = await BluebirdPromise.map(
		accounts.data,
		async account => {
			const [indexedAccount] = resultSet.filter(acc => acc.address === account.address);
			if (indexedAccount) {
				account.isGenesisAccount = indexedAccount.isGenesisAccount;
				if (paramPublicKey && indexedAccount.address === addressFromParamPublicKey) {
					account.publicKey = paramPublicKey;
					await accountsDB.upsert(account);
				} else {
					account.publicKey = indexedAccount.publicKey;
				}
			}

			if (account.publicKey) {
				if (account.isGenesisAccount) {
					account.isMigrated = account.isGenesisAccount;
					account.legacyAddress = getLegacyAddressFromPublicKey(account.publicKey);
				} else {
					// Use only dynamically computed legacyAccount information, ignore the hardcoded info
					const {
						isMigrated,
						legacy,
						legacyAddress,
					} = await getLegacyAccountInfo({ publicKey: account.publicKey });
					Object.assign(account, { isMigrated, legacy, legacyAddress });
				}
			}
			return account;
		},
		{ concurrency: 10 },
	);
	accounts.data = await resolveAccountInfo(accounts.data);
	accounts.data = await resolveDelegateInfo(accounts.data);

	if (paramPublicKey && !accounts.data.length) {
		// Check if reclaim information is available for the account
		const account = {};
		const legacyAccountInfo = await getLegacyAccountInfo({ publicKey: paramPublicKey });
		Object.assign(account, legacyAccountInfo);
		if (Object.keys(account).length) accounts.data.push(account);
	}

	accounts.meta.count = accounts.data.length;
	accounts.meta.offset = params.offset;

	return accounts;
};

const getDelegates = async params => getAccounts({ ...params, isDelegate: true });

const getAllDelegates = async () => requestConnector('invokeEndpoint', { endpoint: 'dpos_getAllDelegates' });

const getMultisignatureGroups = async account => {
	const multisignatureAccount = {};
	if (account.keys && account.keys.numberOfSignatures) {
		multisignatureAccount.isMultisignature = true;
		multisignatureAccount.numberOfReqSignatures = account.keys.numberOfSignatures;
		multisignatureAccount.members = [];

		await BluebirdPromise.map(
			account.keys.mandatoryKeys,
			async publicKey => {
				const mandatoryAccount = {
					address: getBase32AddressFromPublicKey(publicKey),
					publicKey,
					isMandatory: true,
				};
				multisignatureAccount.members.push(mandatoryAccount);
			},
			{ concurrency: account.keys.mandatoryKeys.length },
		);
		await BluebirdPromise.map(
			account.keys.optionalKeys,
			async publicKey => {
				const optionalAccount = {
					address: getBase32AddressFromPublicKey(publicKey),
					publicKey,
					isMandatory: false,
				};
				multisignatureAccount.members.push(optionalAccount);
			},
			{ concurrency: account.keys.optionalKeys.length },
		);
	} else multisignatureAccount.isMultisignature = false;
	return multisignatureAccount;
};

const getMultisignatureMemberships = async account => {
	const multisignatureMemberships = { memberships: [] };
	const multisignatureDB = await getMultisignatureIndex();
	const membershipInfo = await multisignatureDB.find({ memberAddress: account.address }, ['groupAddress', 'memberAddress']);

	await BluebirdPromise.map(
		membershipInfo,
		async membership => {
			const result = await getIndexedAccountInfo(
				{ address: membership.groupAddress, limit: 1 },
				['address', 'username', 'publicKey'],
			);
			multisignatureMemberships.memberships.push({
				address: result && result.address ? result.address : undefined,
				username: result && result.username ? result.username : undefined,
				publicKey: result && result.publicKey ? result.publicKey : undefined,
			});
		},
		{ concurrency: membershipInfo.length },
	);

	return multisignatureMemberships;
};

const resolveMultisignatureMemberships = tx => {
	const multisignatureInfoToIndex = [];
	const allKeys = tx.asset.mandatoryKeys.concat(tx.asset.optionalKeys);

	allKeys.forEach(key => {
		const members = {
			id: getBase32AddressFromPublicKey(tx.senderPublicKey)
				.concat('_', getBase32AddressFromPublicKey(key)),
			memberAddress: getBase32AddressFromPublicKey(key),
			groupAddress: getBase32AddressFromPublicKey(tx.senderPublicKey),
		};
		multisignatureInfoToIndex.push(members);
	});

	return multisignatureInfoToIndex;
};

module.exports = {
	getAccounts,
	getDelegates,
	getAllDelegates,
	getMultisignatureGroups,
	getMultisignatureMemberships,
	getAccountsByAddress,
	getAccountsByPublicKey,
	getAccountsByPublicKey2,
	getIndexedAccountInfo,
	getAccountsBySearch,
	resolveMultisignatureMemberships,
	getNumberOfForgers,
};
