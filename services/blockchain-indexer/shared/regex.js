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

const ADDRESS_LISK32 = /^lsk[a-hjkm-z2-9]{38}$/;
const BLS_KEY = /^\b[a-fA-F0-9]{96}\b$/;
const PROOF_OF_POSSESSION = /^\b[a-fA-F0-9]{192}\b$/;

module.exports = {
	ADDRESS_LISK32,
	BLS_KEY,
	PROOF_OF_POSSESSION,
};