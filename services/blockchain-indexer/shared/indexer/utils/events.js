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

const getEventPK = (height, index) => {
	return (BigInt(height) << 32n) | BigInt(index);
};

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
			eventPK: getEventPK(block.height, event.index),
			data: event.data,
			index: event.index,
			module: event.module,
			name: event.name,
			topics: event.topics,
			height: block.height,
			id: event.id,
			blockID: block.id,
			timestamp: block.timestamp,
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
					eventPK: eventInfo.eventPK,
					topic,
					height: block.height,
					index: event.index,
					timestamp: block.timestamp,
					name: event.name,
					module: event.module,
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
							eventPK: eventInfo.eventPK,
							topic: transactionID,
							height: block.height,
							index: event.index,
							timestamp: block.timestamp,
							name: event.name,
							module: event.module,
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
					eventPK: eventInfo.eventPK,
					topic: event.data.validatorAddress,
					height: block.height,
					index: event.index,
					timestamp: block.timestamp,
					name: event.name,
					module: event.module,
				});
			}
		}
	}

	return eventsInfoToIndex;
};

module.exports = {
	getEventsInfoToIndex,
	getEventPK,
};
