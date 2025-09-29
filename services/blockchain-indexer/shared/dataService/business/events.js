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
		MySQL: { getTableInstance, getDBConnection },
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
const { JSONParseDB } = require('../utils/json');

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
		data: JSONParseDB(events.data),
		index: events.index,
		module: events.module,
		name: events.name,
		topics: JSONParseDB(events.topics),
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

const getEventsBySenderAddress = async params => {
	const knex = await getDBConnection(MYSQL_ENDPOINT);
	const blocksTable = await getBlocksTable();
	const eventsTable = await getEventsTable();

	const events = { data: [], meta: {} };

	const {
		senderAddress,
		topic,
		transactionID,
		blockID,
		limit = 10,
		offset = 0,
		sort,
		order,
		module,
		name,
		timestamp,
		height,
	} = params;

	// Build topic set
	const topicsSet = new Set();
	if (topic) topic.split(',').forEach(t => topicsSet.add(t.trim()));
	if (transactionID) {
		const txTopic =
			transactionID.length === LENGTH_ID ? EVENT_TOPIC_PREFIX.TX_ID + transactionID : transactionID;
		topicsSet.add(txTopic);
	}

	// if blockID provided, resolve to height (unless height is also provided)
	let effectiveHeight = height;
	if (blockID && !height) {
		const [block] = await blocksTable.find({ id: blockID, limit: 1 }, ['height']);
		effectiveHeight = block?.height;
	}

	const et = eventTopicsTableSchema.tableName;
	const tx = transactionsTableSchema.tableName;

	// Base query
	let query = knex
		.select('et.eventPK')
		.from(`${et} as et`)
		.innerJoin(`${tx} as tx`, function () {
			this.on('et.topic', knex.raw(`CONCAT(?, tx.id)`, [EVENT_TOPIC_PREFIX.TX_ID]));
		})
		.where('tx.senderAddress', senderAddress);

	// Filters
	if (topicsSet.size) query = query.whereIn('et.topic', [...topicsSet]);
	if (module) query = query.andWhere('et.module', module);
	if (name) query = query.andWhere('et.name', name);

	if (effectiveHeight) {
		if (String(effectiveHeight).includes(':')) {
			const [fromStr, toStr] = effectiveHeight.split(':').map(Number);
			query = query.andWhereBetween('et.height', [fromStr, toStr]);
		} else {
			query = query.andWhere('et.height', Number(effectiveHeight));
		}
	}

	if (timestamp) {
		if (String(timestamp).includes(':')) {
			const [fromStr, toStr] = timestamp.split(':').map(Number);
			query = query.andWhereBetween('et.timestamp', [fromStr, toStr]);
		} else {
			query = query.andWhere('et.timestamp', Number(timestamp));
		}
	}

	// Order by
	const allowedSortCols = new Set(['height', 'timestamp', 'index', 'module', 'name', 'topic']);
	if (sort) {
		const [col, dir] = sort.split(':');
		if (allowedSortCols.has(col)) query = query.orderBy(`et.${col}`, dir?.toUpperCase() || 'DESC');
	}
	if (order) {
		const [col, dir] = order.split(':');
		if (allowedSortCols.has(col)) query = query.orderBy(`et.${col}`, dir?.toUpperCase() || 'DESC');
	}
	if (!sort && !order) {
		query = query.orderBy([
			{ column: 'tx.timestamp', order: 'desc' },
			{ column: 'tx.index', order: 'asc' },
		]);
	}

	// Pagination
	query = query.limit(limit).offset(offset);

	// Execute SELECT query
	const eventTopicRows = await query;
	if (!eventTopicRows.length) {
		events.meta = { count: 0, offset, total: 0 };
		return events;
	}

	// Collect eventPKs
	const eventPKsToRetrieve = eventTopicRows.map(r => r.eventPK);

	// Fetch full events
	const eventsInfo = await eventsTable.find(
		{ whereIn: { property: 'eventPK', values: eventPKsToRetrieve } },
		[...EVENT_COLUMNS, 'blockID', 'timestamp'],
	);

	events.data = await BluebirdPromise.map(
		eventsInfo,
		row => {
			const event = parseEventsData(row);
			return {
				...event,
				block: {
					id: row.blockID,
					height: row.height,
					timestamp: row.timestamp,
				},
			};
		},
		{ concurrency: Math.min(eventsInfo.length, MAX_GET_EVENTS_CONCURRENCY) },
	);

	// Count query (reuse same filters, no limit/offset)
	const countQuery = knex
		.count({ total: '*' })
		.from(`${et} as et`)
		.innerJoin(`${tx} as tx`, function () {
			this.on('et.topic', knex.raw(`CONCAT(?, tx.id)`, [EVENT_TOPIC_PREFIX.TX_ID]));
		})
		.where('tx.senderAddress', senderAddress);

	if (topicsSet.size) countQuery.andWhereIn('et.topic', [...topicsSet]);
	if (module) countQuery.andWhere('et.module', module);
	if (name) countQuery.andWhere('et.name', name);
	if (effectiveHeight) {
		if (String(effectiveHeight).includes(':')) {
			const [fromStr, toStr] = effectiveHeight.split(':').map(Number);
			countQuery.andWhereBetween('et.height', [fromStr, toStr]);
		} else {
			countQuery.andWhere('et.height', Number(effectiveHeight));
		}
	}
	if (timestamp) {
		if (String(timestamp).includes(':')) {
			const [fromStr, toStr] = timestamp.split(':').map(Number);
			countQuery.andWhereBetween('et.timestamp', [fromStr, toStr]);
		} else {
			countQuery.andWhere('et.timestamp', Number(timestamp));
		}
	}

	const [{ total }] = await countQuery;

	events.meta = {
		count: events.data.length,
		offset,
		total: Number(total),
	};

	return events;
};

const getEvents = async params => {
	if (params.senderAddress) return getEventsBySenderAddress(params);

	const blocksTable = await getBlocksTable();
	const eventsTable = await getEventsTable();
	const eventTopicsTable = await getEventTopicsTable();

	const events = { data: [], meta: {} };
	const topicsToQuery = new Set();

	let queryParams = { ...params };
	let distincTopicParams = 0;
	let isTopicQuery = false;

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
		isTopicQuery = true;

		const topicsToRemove =
			transactionID.length === LENGTH_ID
				? [EVENT_TOPIC_PREFIX.TX_ID + transactionID, transactionID]
				: [transactionID, transactionID.slice(EVENT_TOPIC_PREFIX.TX_ID.length)];

		if (queryParams.topic) {
			const topicsArr = queryParams.topic.split(',');
			const filteredTopics = topicsArr.filter(t => !topicsToRemove.includes(t));
			if (filteredTopics.length === 0) {
				// Remove topic entirely if it was the only one
				const { topic, ...restWithoutTopic } = queryParams;
				queryParams = restWithoutTopic;
			} else if (filteredTopics.length !== topicsArr.length) {
				queryParams.topic = filteredTopics.join(',');
			}
		}

		const transactionTopic =
			transactionID.length === LENGTH_ID ? EVENT_TOPIC_PREFIX.TX_ID + transactionID : transactionID;

		if (!topicsToQuery.has(transactionTopic)) {
			distincTopicParams += 1;
			topicsToQuery.add(transactionTopic);
		}
	}

	// By topic
	if (queryParams.topic) {
		const { topic, ...rest } = queryParams;
		queryParams = rest;
		isTopicQuery = true;

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

	if (isTopicQuery) {
		if (topicsToQuery.size === 0) {
			// No events found for the given senderAddress / transactionID
			events.meta = { count: 0, offset: queryParams.offset || 0, total: 0 };
			return events;
		}

		const topicQuery = {
			...queryParams,
			forceIndex: 'event_topics_index_topic_only_sort',
			whereIn: { property: 'topic', values: [...topicsToQuery] },
		};
		if (distincTopicParams > 1) {
			topicQuery.groupBy = 'eventPK';
			topicQuery.havingRaw = `COUNT(DISTINCT topic) = ${distincTopicParams}`;
		}

		// NOTE: force index to topic_combination_sort (topic, module, name, height, timestamp DESC, index ASC)
		if (Object.keys(topicQuery).some(key => ['module', 'name', 'height'].includes(key))) {
			topicQuery.forceIndex = 'event_topics_index_topic_combination_sort';
		}

		totalFromTopicTable = Number(await eventTopicsTable.count(topicQuery));

		if (totalFromTopicTable > 0) {
			const eventTopics = await eventTopicsTable.find(topicQuery, ['eventPK']);
			eventPKsToRetrieve.push(...eventTopics.map(et => et.eventPK));
		} else {
			// No events found for the given topics
			events.meta = { count: 0, offset: queryParams.offset || 0, total: 0 };
			return events;
		}
	}

	// Final query
	const { topic, order, sort, limit = 10, offset = 0, ...finalParams } = queryParams;
	const eventQueryParams = { ...finalParams };
	if (eventPKsToRetrieve.length > 0) {
		eventQueryParams.whereIn = { property: 'eventPK', values: eventPKsToRetrieve };
	} else {
		eventQueryParams.limit = limit;
		eventQueryParams.offset = offset;
		eventQueryParams.order = order;
		eventQueryParams.sort = sort;
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
			: Number(await eventsTable.count(finalParams));

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
