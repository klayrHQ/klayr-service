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
const {
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const config = require('../../../../config');
const tokenBalancesTableSchema = require('../../../database/schema/tokenBalances');

const { getAccountKnowledge } = require('../../knownAccounts');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getTokenBalancesTable = () => getTableInstance(tokenBalancesTableSchema, MYSQL_ENDPOINT);

const getTokenTopBalances = async params => {
	const response = {
		data: {},
		meta: {},
	};

	const { search, tokenID, limit, offset, sort } = params;

	const tokenBalancesTable = await getTokenBalancesTable();

	let dataQuery = `
		SELECT
			tb.address,
			tb.availableBalance,
			acc.name,
			acc.publicKey,
			locked.lockedBalance
		FROM
			token_balances tb
		LEFT JOIN
			accounts acc ON tb.address = acc.address
		LEFT JOIN
			(SELECT
				address,
				tokenID,
				SUM(balance) AS lockedBalance
			FROM
				token_locked
			GROUP BY
				address, tokenID
			) AS locked ON tb.address = locked.address AND tb.tokenID = locked.tokenID
		WHERE
			tb.tokenID = ${tokenID}
	`;

	if (search) {
		dataQuery += ` AND (tb.address LIKE '%${search}%' OR acc.name LIKE '%${search}%' OR acc.publicKey LIKE '%${search}%')`;
	}

	const sortOrder = sort && sort.endsWith(':asc') ? 'ASC' : 'DESC';
	dataQuery += ` ORDER BY (CAST(tb.availableBalance AS SIGNED) + CAST(COALESCE(locked.lockedBalance, 0) AS SIGNED)) ${sortOrder}, acc.name ASC`;

	if (limit) {
		dataQuery += ` LIMIT ${limit}`;
	}

	if (offset) {
		dataQuery += ` OFFSET ${offset}`;
	}

	const tokenInfosResult = await tokenBalancesTable.rawQuery(dataQuery);
	const tokenInfos = tokenInfosResult;

	// --- Count Query ---
	let countQuery = `
        SELECT COUNT(tb.address) AS count
        FROM token_balances tb
        JOIN accounts acc ON tb.address = acc.address
        WHERE tb.tokenID = ${tokenID}
    `;
	if (search) {
		countQuery += ` AND (tb.address LIKE '%${search}%' OR acc.name LIKE '%${search}%' OR acc.publicKey LIKE '%${search}%')`;
	}
	const totalResult = await tokenBalancesTable.rawQuery(countQuery);
	const total = totalResult[0].count;

	const filteredTokenInfos = [];
	// eslint-disable-next-line no-restricted-syntax
	for (const tokenInfo of tokenInfos) {
		const knowledge = getAccountKnowledge(tokenInfo.address);
		const totalBalance = BigInt(tokenInfo.availableBalance) + BigInt(tokenInfo.lockedBalance || 0);

		filteredTokenInfos.push({
			address: tokenInfo.address,
			publicKey: tokenInfo.publicKey,
			name: tokenInfo.name,
			balance: totalBalance.toString(),
			knowledge,
		});
	}

	response.data[tokenID] = filteredTokenInfos;

	response.meta = {
		count: tokenInfos.length,
		offset: params.offset,
		total,
	};

	return response;
};

module.exports = {
	getTokenTopBalances,
};
