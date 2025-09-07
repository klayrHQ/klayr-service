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
const { EVENT, EVENT_TOPIC_PREFIX, LENGTH_ID, MODULE } = require('../../constants');
const msgpack = require('@msgpack/msgpack');

const getEventsInfoToIndex = (block, events) => {
	const eventsInfoToIndex = {
		eventsInfo: [],
		eventTopicsInfo: [],
	};

	// eventsInfoKeys is used to prevent duplicate entry with lookup complexity of O(1)
	const eventsInfoKeys = {
		eventsInfo: {},
		eventTopicsInfo: {},
	};

	// Precompute the next COMMAND_EXECUTION_RESULT event for each index
	const nextCommandExecResultEvent = new Array(events.length);
	let next = null;
	for (let i = events.length - 1; i >= 0; i--) {
		if (events[i].name === EVENT.COMMAND_EXECUTION_RESULT) {
			next = events[i];
		}
		nextCommandExecResultEvent[i] = next;
	}

	for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
		const event = events[eventIndex];

		// Store whole event is now the default behavior
		// Storing whole event is required to fetch events of a deleted block, and to make event retrieval faster
		const eventInfo = {
			id: event.id,
			name: event.name,
			module: event.module,
			height: block.height,
			index: event.index,
			blockID: block.id,
			timestamp: block.timestamp,
			eventBlob: Buffer.from(msgpack.encode(event)),
		};

		if (!eventsInfoKeys.eventsInfo[`${event.id}`]) {
			eventsInfoKeys.eventsInfo[`${event.id}`] = true;
			eventsInfoToIndex.eventsInfo.push(eventInfo);
		}

		for (let t = 0; t < event.topics.length; t++) {
			const topic = event.topics[t];

			if (!eventsInfoKeys.eventTopicsInfo[`${event.id}-${topic}`]) {
				eventsInfoKeys.eventTopicsInfo[`${event.id}-${topic}`] = true;
				eventsInfoToIndex.eventTopicsInfo.push({
					eventID: event.id,
					topic,
				});
			}

			// Add the corresponding transactionID as a topic when not present in the topics list
			// i.e. only when the topic starts with the CCM ID prefix
			// Useful to fetch the relevant events when queried by transactionID
			if (
				topic.startsWith(EVENT_TOPIC_PREFIX.CCM_ID) &&
				topic.length === EVENT_TOPIC_PREFIX.CCM_ID.length + LENGTH_ID
			) {
				const commandExecResultEvent = nextCommandExecResultEvent[eventIndex];

				if (commandExecResultEvent && commandExecResultEvent.topics.length > 0) {
					const topicTransactionID = commandExecResultEvent.topics[0];

					const transactionID = // Remove the topic prefix from transactionID before indexing
						topicTransactionID.length === EVENT_TOPIC_PREFIX.TX_ID.length + LENGTH_ID
							? topicTransactionID.slice(EVENT_TOPIC_PREFIX.TX_ID.length)
							: topicTransactionID;

					if (!eventsInfoKeys.eventTopicsInfo[`${event.id}-${transactionID}`]) {
						eventsInfoKeys.eventTopicsInfo[`${event.id}-${transactionID}`] = true;
						eventsInfoToIndex.eventTopicsInfo.push({
							eventID: event.id,
							topic: transactionID,
						});
					}
				}
			}
		}

		// Add validator address as a topic for rewardsAssigned events, required for export microservice
		if (event.module === MODULE.POS && event.name === EVENT.REWARDS_ASSIGNED) {
			if (!eventsInfoKeys.eventTopicsInfo[`${event.id}-${event.data.validatorAddress}`]) {
				eventsInfoKeys.eventTopicsInfo[`${event.id}-${event.data.validatorAddress}`] = true;
				eventsInfoToIndex.eventTopicsInfo.push({
					eventID: event.id,
					topic: event.data.validatorAddress,
				});
			}
		}
	}

	return eventsInfoToIndex;
};

module.exports = {
	getEventsInfoToIndex,
};
