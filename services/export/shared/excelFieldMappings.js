/*
 * LiskHQ/lisk-service
 * Copyright © 2021 Lisk Foundation
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
const transactionMappings = [
	{ header: 'Date', key: 'date' },
	{ header: 'Time', key: 'time' },
	{ header: 'Block Height', key: 'blockHeight' },
	{ header: 'Transaction ID', key: 'transactionID' },
	{ header: 'Module:Command', key: 'moduleCommand' },
	{ header: 'Transaction Fee', key: 'fee' },
	{ header: 'Amount', key: 'amount' },
	{ header: 'Amount Token ID', key: 'amountTokenID' },
	{ header: 'Message Fee', key: 'messageFee' },
	{ header: 'Message Fee Token ID', key: 'messageFeeTokenID' },
	{ header: 'Sender Address', key: 'senderAddress' },
	{ header: 'Sender Public Key', key: 'senderPublicKey' },
	{ header: 'Recipient Address', key: 'recipientAddress' },
	{ header: 'Recipient Public Key', key: 'recipientPublicKey' },
	// TODO: Verify if needed
	{ header: 'Reward Token ID', key: 'rewardTokenID' },
	{ header: 'Reward Amount', key: 'rewardAmount' },
	{ header: 'Note', key: 'note' },
	{ header: 'Sending Chain ID', key: 'sendingChainID' },
	{ header: 'Receiving Chain ID', key: 'receivingChainID' },
];

const metadataMappings = [
	{ header: 'Current Chain ID', key: 'currentChainID' },
	{ header: 'Fee Token ID', key: 'feeTokenID' },
	{ header: 'Conversion Factor', key: 'conversionFactor' },
	{ header: 'Date Format', key: 'dateFormat' },
	{ header: 'Time Format', key: 'timeFormat' },
	{ header: 'Opening Balance', key: 'openingBalance' },
	{ header: 'Legacy Balance', key: 'legacyBalance' },
];

module.exports = {
	transactionMappings,
	metadataMappings,
};
