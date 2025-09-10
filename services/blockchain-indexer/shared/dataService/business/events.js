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
const BluebirdPromise = require('bluebird');

const {
	CacheLRU,
	Exceptions: { NotFoundException },
	DB: {
		MySQL: { getTableInstance },
	},
} = require('klayr-service-framework');

const config = require('../../../config');

const blocksTableSchema = require('../../database/schema/blocks');
const eventsTableSchema = require('../../database/schema/events');
const eventTopicsTableSchema = require('../../database/schema/eventTopics');
const transactionsTableSchema = require('../../database/schema/transactions');

const { requestConnector } = require('../../utils/request');
const { normalizeRangeParam } = require('../../utils/param');
const { parseToJSONCompatObj } = require('../../utils/parser');
const { LENGTH_ID, EVENT_TOPIC_PREFIX } = require('../../constants');

const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const getBlocksTable = () => getTableInstance(blocksTableSchema, MYSQL_ENDPOINT);
const getEventsTable = () => getTableInstance(eventsTableSchema, MYSQL_ENDPOINT);
const getEventTopicsTable = () => getTableInstance(eventTopicsTableSchema, MYSQL_ENDPOINT);
const getTransactionsTable = () => getTableInstance(transactionsTableSchema, MYSQL_ENDPOINT);

const MAX_GET_EVENTS_CONCURRENCY = 20;

const eventCache = CacheLRU('events');
const eventCacheByBlockID = CacheLRU('eventsByBlockID');

const EVENT_COLUMNS = ['data', 'index', 'module', 'name', 'topics', 'height', 'id'];

const parseEventsData = events => {
	return {
		data: JSON.parse(events.data),
		index: events.index,
		module: events.module,
		name: events.name,
		topics: JSON.parse(events.topics),
		height: events.height,
		id: events.id,
	};
};

const getEventsByHeightFromNode = async height => {
	const events = await requestConnector('getEventsByHeight', { height });
	return parseToJSONCompatObj(events);
};

const getEventsByHeight = async height => {
	// Get from cache
	const cachedEvents = await eventCache.get(height);
	if (cachedEvents) return JSON.parse(cachedEvents);

	// Get from DB first (this is the default behavior)
	const eventsTable = await getEventsTable();
	const dbEventDatas = await eventsTable.find({ height }, EVENT_COLUMNS);

	if (dbEventDatas.length) {
		const dbEvents = dbEventDatas.map(events => parseEventsData(events));
		await eventCache.set(height, JSON.stringify(dbEvents));
		return dbEvents;
	}

	// Get from node
	const eventsFromNode = await getEventsByHeightFromNode(height);
	await eventCache.set(height, JSON.stringify(eventsFromNode));
	return eventsFromNode;
};

const getEventsByBlockID = async blockID => {
	// Get from cache
	const cachedEvents = await eventCacheByBlockID.get(blockID);
	if (cachedEvents) return JSON.parse(cachedEvents);

	// Get from DB incase of cache miss
	const eventsTable = await getEventsTable();
	const dbEventDatas = await eventsTable.find({ blockID }, EVENT_COLUMNS);

	if (dbEventDatas.length) {
		const dbEvents = dbEventDatas.map(events => parseEventsData(events));
		eventCacheByBlockID.set(blockID, JSON.stringify(dbEvents));
		return dbEvents;
	}

	return [];
};

const cacheEventsByBlockID = async (blockID, events) => {
	await eventCacheByBlockID.set(blockID, JSON.stringify(events));
};

const deleteEventsFromCache = async height => eventCache.delete(height);

const deleteEventsFromCacheByBlockID = async blockID => eventCacheByBlockID.delete(blockID);

const getEvents = async params => {
	const blocksTable = await getBlocksTable();
	const eventsTable = await getEventsTable();
	const eventTopicsTable = await getEventTopicsTable();

	const events = { data: [], meta: {} };
	const topicsToQuery = new Set();

	let queryParams = { ...params };
	let distincTopicParams = 0;

	// Normalize ranges
	if (
		queryParams.height &&
		typeof queryParams.height === 'string' &&
		queryParams.height.includes(':')
	) {
		queryParams = normalizeRangeParam(queryParams, 'height');
	}

	if (queryParams.timestamp && queryParams.timestamp.includes(':')) {
		queryParams = normalizeRangeParam(queryParams, 'timestamp');
	}

	// By transactionID
	if (queryParams.transactionID) {
		const { transactionID, ...rest } = queryParams;
		queryParams = rest;

		const transactionTopic =
			transactionID.length === LENGTH_ID ? EVENT_TOPIC_PREFIX.TX_ID + transactionID : transactionID;

		if (!topicsToQuery.has(transactionTopic)) {
			distincTopicParams += 1;
			topicsToQuery.add(transactionTopic);
		}
	}

	// By senderAddress
	if (queryParams.senderAddress) {
		const { senderAddress, ...rest } = queryParams;
		queryParams = rest;

		const transactionsTable = await getTransactionsTable();
		const txRows = await transactionsTable.find({ senderAddress }, ['id']);
		const txIDsToQuery = txRows.map(r =>
			r.id.length === LENGTH_ID ? EVENT_TOPIC_PREFIX.TX_ID + r.id : r.id,
		);

		if (txIDsToQuery.some(item => !topicsToQuery.has(item))) {
			distincTopicParams += 1;
			txIDsToQuery.forEach(item => topicsToQuery.add(item));
		}
	}

	// By topic
	if (queryParams.topic) {
		const { topic, ...rest } = queryParams;
		queryParams = rest;

		const topics = topic.split(',');
		const topicsLists = topics.flatMap(t =>
			t.length === LENGTH_ID ? [EVENT_TOPIC_PREFIX.TX_ID + t, EVENT_TOPIC_PREFIX.CCM_ID + t] : [t],
		);

		if (topicsLists.some(item => !topicsToQuery.has(item))) {
			distincTopicParams += 1;
			topicsLists.forEach(item => topicsToQuery.add(item));
		}
	}

	// By blockID
	if ('blockID' in queryParams) {
		const { blockID, ...rest } = queryParams;
		queryParams = rest;

		const [block] = await blocksTable.find({ id: blockID, limit: 1 }, ['height']);
		if (!block || !block.height) {
			throw new NotFoundException(`Invalid blockID: ${blockID}`);
		}

		if ('height' in queryParams) {
			let heightLowerBound = Number(queryParams.height);
			let heightHigherBound = heightLowerBound;

			if (typeof queryParams.height === 'string' && queryParams.height.includes(':')) {
				const [fromStr, toStr] = queryParams.height.split(':');
				heightLowerBound = Number(fromStr);
				heightHigherBound = Number(toStr);
			}

			if (block.height < heightLowerBound || block.height > heightHigherBound) {
				throw new NotFoundException(
					`Invalid combination of blockID: ${blockID} and height: ${queryParams.height}`,
				);
			}
		}

		queryParams.height = block.height;
	}

	const eventPKsToRetrieve = [];
	let totalFromTopicTable = 0;

	if (topicsToQuery.size > 0) {
		const topicQuery = {
			...queryParams,
			whereIn: { property: 'topic', values: [...topicsToQuery] },
		};
		if (distincTopicParams > 1) {
			topicQuery.groupBy = 'eventPK';
			topicQuery.havingRaw = `COUNT(DISTINCT topic) = ${distincTopicParams}`;
		}

		totalFromTopicTable = await eventTopicsTable.count(topicQuery);

		if (totalFromTopicTable > 0) {
			const eventTopics = await eventTopicsTable.find(topicQuery, ['eventPK']);
			eventPKsToRetrieve.push(...eventTopics.map(et => et.eventPK));
		}
	}

	// Final query
	const { topic, order, sort, limit = 10, offset = 0, ...finalParams } = queryParams;
	const eventQueryParams = { ...finalParams, order, sort, limit, offset };
	if (eventPKsToRetrieve.length > 0) {
		eventQueryParams.whereIn = { property: 'eventPK', values: eventPKsToRetrieve };
	}

	const eventsInfo = await eventsTable.find(eventQueryParams, [
		...EVENT_COLUMNS,
		'blockID',
		'timestamp',
	]);

	// Decode
	events.data = await BluebirdPromise.map(
		eventsInfo,
		events => {
			const event = parseEventsData(events);
			return {
				...event,
				block: { id: events.blockID, height: events.height, timestamp: events.timestamp },
			};
		},
		{ concurrency: Math.min(eventsInfo.length, MAX_GET_EVENTS_CONCURRENCY) },
	);

	// Count
	const total =
		totalFromTopicTable > 0
			? totalFromTopicTable // Count already obtained from eventTopicTable
			: await eventsTable.count(finalParams);

	events.meta = {
		count: events.data.length,
		offset,
		total,
	};

	return events;
};

module.exports = {
	getEvents,
	getEventsByHeight,
	cacheEventsByBlockID,
	deleteEventsFromCacheByBlockID,
	getEventsByBlockID,
	deleteEventsFromCache,
};
