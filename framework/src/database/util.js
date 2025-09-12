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
/* eslint-disable nonblock-statement-body-position */
const Logger = require('../logger').get;

const logger = Logger();

const CHAR_ESCAPE_MAP = Object.freeze({
	'%': '\\%',
	_: '\\_',
});

const escapeUserInput = input => {
	const escapedInput = input.replace(new RegExp(/%|_/g), char => CHAR_ESCAPE_MAP[char]);
	return escapedInput;
};

const loadSchema = async (knex, tableName, tableConfig) => {
	const { primaryKey, charset, schema, indexes = {}, compositeIndexes = {} } = tableConfig;

	if (await knex.schema.hasTable(tableName)) return knex;

	// --- Supported type groups ---
	const typesWithLength = ['string', 'binary'];
	const typesWithPrecision = ['decimal', 'float', 'double'];
	const typesWithTextType = ['text'];
	const typesWithEnum = ['enum'];
	const typesWithOptions = ['dateTime', 'timestamp'];
	const typesFallback = ['integer', 'bigInteger', 'boolean', 'date', 'time', 'json', 'jsonb'];
	const specialTypes = ['increments', 'timestamps', 'specificType'];

	const allSupportedTypes = [
		...typesWithLength,
		...typesWithPrecision,
		...typesWithTextType,
		...typesWithEnum,
		...typesWithOptions,
		...typesFallback,
		...specialTypes,
	];

	await knex.schema
		.createTable(tableName, table => {
			// ⚠️ Charset is MySQL/MariaDB-only
			if (charset && typeof table.charset === 'function') {
				table.charset(charset);
			}

			Object.entries(schema).forEach(([colName, colDef]) => {
				let kProp;
				const { type, length, precision, scale, textType, values, options, dbType, increments } =
					colDef;

				// --- Validate type ---
				if (!allSupportedTypes.includes(type)) {
					throw new Error(
						`Unsupported type "${type}" for column "${colName}" in table "${tableName}". ` +
							`Allowed types: ${allSupportedTypes.join(', ')}`,
					);
				}

				// --- Validate optional parameters ---
				if (typesWithLength.includes(type) && length !== undefined && typeof length !== 'number') {
					throw new Error(
						`Column "${colName}" of type "${type}" expects "length" to be a number, got: ${length}`,
					);
				}
				if (typesWithPrecision.includes(type)) {
					if (precision !== undefined && typeof precision !== 'number') {
						throw new Error(
							`Column "${colName}" of type "${type}" expects "precision" to be a number if provided, got: ${precision}`,
						);
					}
					if (scale !== undefined && typeof scale !== 'number') {
						throw new Error(
							`Column "${colName}" of type "${type}" expects "scale" to be a number if provided, got: ${scale}`,
						);
					}
				}
				if (type === 'enum' && (!Array.isArray(values) || values.length === 0)) {
					throw new Error(
						`Column "${colName}" of type "enum" requires a non-empty "values" array, got: ${values}`,
					);
				}
				if (type === 'specificType' && (typeof dbType !== 'string' || !dbType.trim())) {
					throw new Error(
						`Column "${colName}" of type "specificType" requires a non-empty "dbType" string, got: ${dbType}`,
					);
				}

				// --- Column creation ---
				switch (true) {
					// Auto increment
					case !!increments:
						kProp = table.increments(colName, options || { primaryKey: false });
						break;

					// String / Binary with length
					case typesWithLength.includes(type):
						kProp = table[type](colName, length);
						break;

					// Decimal / Float / Double with precision & scale
					case typesWithPrecision.includes(type):
						kProp = table[type](colName, precision, scale);
						break;

					// Text with optional textType
					case type === 'text':
						kProp = table.text(colName, textType);
						break;

					// Enum
					case type === 'enum':
						kProp = table.enum(colName, values, options);
						break;

					// DateTime / Timestamp
					case typesWithOptions.includes(type):
						kProp = table[type](colName, options);
						break;

					// Timestamps helper
					case type === 'timestamps':
						kProp = table.timestamps(options?.useTz, options?.precision);
						break;

					// SpecificType
					case type === 'specificType':
						kProp = table.specificType(colName, dbType);
						break;

					// Default fallback (integer, bigInteger, boolean, date, time, json, jsonb)
					default:
						kProp = table[type](colName);
				}

				// --- Column modifiers ---
				if (colDef.null === false) kProp.notNullable();
				if (colDef.null === true) kProp.nullable();
				if ('defaultValue' in colDef) kProp.defaultTo(colDef.defaultValue);
				if (colDef.unique === true) kProp.unique();
				if (colDef.unsigned === true && typeof kProp.unsigned === 'function') kProp.unsigned();
				if (indexes[colName]) kProp.index();
			});

			// Table-level primary key
			if (primaryKey) table.primary(primaryKey);
		})
		.then(() => logger.info(`Successfully created table: ${tableName}.`))
		.catch(err => {
			if (err.message.includes(`Table '${tableName}' already exists`)) return;
			throw err;
		});

	// Composite indexes
	for (const key in compositeIndexes) {
		const indexDef = compositeIndexes[key];

		// --- Backward compatibility: allow array shorthand ---
		const isArrayShorthand = Array.isArray(indexDef);
		const columns = isArrayShorthand ? indexDef : indexDef.columns;

		if (!Array.isArray(columns) || columns.length === 0) {
			throw new Error(`Composite index "${key}" must define a non-empty "columns" array.`);
		}

		const { unique, type, where } = isArrayShorthand ? {} : indexDef;
		const indexName = `${tableName}_index_${key}`;

		// --- Build column definitions ---
		const indexColumns = columns
			.map(col => {
				if (!col.key) {
					throw new Error(
						`Composite index "${key}" is missing required "key" property in one of its columns.`,
					);
				}
				if (col.direction) {
					const direction = col.direction.toUpperCase();
					if (direction !== 'ASC' && direction !== 'DESC') {
						throw new Error(
							`Invalid direction "${col.direction}" for column "${col.key}" in composite index "${key}". Use "ASC" or "DESC".`,
						);
					}
					return `\`${col.key}\` ${direction}`;
				}
				return `\`${col.key}\``; // default: no direction
			})
			.join(', ');

		// --- Build SQL parts ---
		const uniqueSql = unique ? 'UNIQUE' : '';
		const typeSql = type ? `${type.toUpperCase()}` : '';
		const whereSql = where ? `WHERE ${where}` : '';

		const sqlStatement =
			`ALTER TABLE ${tableName} ADD ${uniqueSql} ${typeSql} INDEX ${indexName} (${indexColumns}) ${whereSql}`.trim();

		await knex.raw(sqlStatement);
	}

	return knex;
};

const cast = (val, type) => {
	if (typeof val === 'undefined') return null;
	if (type === 'number') return Number(val);
	if (type === 'integer') return Number(val);
	if (type === 'string') return String(val);
	if (type === 'boolean') return Boolean(val);
	if (type === 'bigInteger') return BigInt(val);
	if (type === 'json') return JSON.stringify(val);
	return val;
};

const resolveQueryParams = params => {
	const KNOWN_QUERY_PARAMS = [
		'sort',
		'limit',
		'offset',
		'propBetweens',
		'andWhere',
		'orWhere',
		'orWhereWith',
		'whereNot',
		'whereIn',
		'whereNotIn',
		'orWhereIn',
		'whereBetween',
		'whereJsonSupersetOf',
		'search',
		'aggregate',
		'distinct',
		'order',
		'orSearch',
		'whereNull',
		'whereNotNull',
		'leftOuterJoin',
		'rightOuterJoin',
		'innerJoin',
		'groupBy',
		'orderByRaw',
		'havingRaw',
	];
	const queryParams = Object.keys(params)
		.filter(key => !KNOWN_QUERY_PARAMS.includes(key))
		.reduce((obj, key) => {
			obj[key] = params[key];
			return obj;
		}, {});
	return queryParams;
};

const getValue = val => {
	if (typeof val === 'undefined') return null;
	if (Number.isNaN(val)) return null;
	return val;
};

const mapRowsBySchema = async (rawRows, schema) => {
	const rows = [];
	rawRows.forEach(item => {
		const row = {};
		Object.keys(schema).forEach(column => {
			const val = item[column];
			const valType = schema[column].type;
			if (`${column}` in item) row[column] = getValue(cast(val, valType));
		});
		rows.push(row);
	});
	return rows;
};

const startDBTransaction = async connection => connection.transaction();

const commitDBTransaction = async transaction => transaction.commit();

const rollbackDBTransaction = async transaction => transaction.rollback();

const getTableInstance = (tableConfig, knex) => {
	const { tableName, primaryKey, schema } = tableConfig;

	const createDefaultTransaction = async connection => startDBTransaction(connection);

	const upsert = async (inputRows, trx) => {
		let isDefaultTrx = false;
		if (!trx) {
			trx = await createDefaultTransaction(knex);
			isDefaultTrx = true;
		}

		let rawRows = inputRows;
		if (!Array.isArray(rawRows)) rawRows = [inputRows];
		const rows = await mapRowsBySchema(rawRows, schema);

		// Create all queries for `INSERT or UPDATE on Duplicate keys`
		// eslint-disable-next-line max-len
		const queries = rows.map(row =>
			// eslint-disable-next-line implicit-arrow-linebreak, newline-per-chained-call
			knex(tableName).transacting(trx).insert(row).onConflict(primaryKey).merge(),
		);

		// Perform all queries within a batch together
		if (isDefaultTrx)
			return Promise.all(queries)
				.then(async result => {
					await trx.commit();
					return result;
				})
				.catch(async err => {
					await trx.rollback();
					logger.error(err.message);
					throw err;
				});
		return Promise.all(queries);
	};

	const insert = async (inputRows, trx) => {
		let isDefaultTrx = false;
		if (!trx) {
			trx = await createDefaultTransaction(knex);
			isDefaultTrx = true;
		}

		let rawRows = inputRows;
		if (!Array.isArray(rawRows)) rawRows = [inputRows];
		const rows = await mapRowsBySchema(rawRows, schema);

		// Perform a single bulk INSERT
		const query = knex(tableName).transacting(trx).insert(rows);

		if (isDefaultTrx) {
			return query
				.then(async result => {
					await trx.commit();
					return result;
				})
				.catch(async err => {
					await trx.rollback();
					logger.error(err.message);
					throw err;
				});
		}
		return query;
	};

	const queryBuilder = (params, columns, isCountQuery, trx) => {
		const query = knex(tableName).transacting(trx);
		const queryParams = resolveQueryParams(params);

		if (isCountQuery) {
			if (columns && !params.distinct) {
				query.count(`${columns[0]} as count`);
			} else if (params.distinct) {
				query.countDistinct(`${params.distinct} as count`);
			}
		} else {
			if (columns) {
				query.select(columns);
			}

			if (params.distinct) {
				const distinctParams = params.distinct.split(',');
				query.distinct(distinctParams);
			}

			if (params.groupBy) {
				query.groupBy(params.groupBy);
			}

			if (params.sort) {
				const [sortColumn, sortDirection] = params.sort.split(':');
				query.whereNotNull(sortColumn);
				query.select(sortColumn).orderBy(sortColumn, sortDirection);
			}

			if (params.order) {
				const [orderColumn, orderDirection] = params.order.split(':');
				query.whereNotNull(orderColumn);
				query.select(orderColumn).orderBy(orderColumn, orderDirection);
			}

			if (params.orderByRaw) {
				params.orderByRaw.forEach(orderBy => {
					const [col] = orderBy.split(' ');
					query.select(knex.raw(col)).orderByRaw(orderBy);
				});
			}

			if (params.havingRaw) {
				query.having(knex.raw(params.havingRaw));
			}

			if (params.aggregate) {
				query.sum(`${params.aggregate} as total`);
			}

			if (params.limit) {
				query.limit(Number(params.limit));
			} else {
				logger.trace(`No 'limit' set for the query:\n${query.toString()}.`);
			}

			if (params.offset) query.offset(Number(params.offset));
		}

		if (params.where) {
			query.where(params.where);
		} else {
			query.where(queryParams);
		}

		if (params.propBetweens) {
			const { propBetweens } = params;
			propBetweens.forEach(propBetween => {
				if ('from' in propBetween) query.where(propBetween.property, '>=', propBetween.from);
				if ('to' in propBetween) query.where(propBetween.property, '<=', propBetween.to);
				if ('greaterThanEqualTo' in propBetween)
					query.where(propBetween.property, '>=', propBetween.greaterThanEqualTo);
				if ('lowerThanEqualTo' in propBetween)
					query.where(propBetween.property, '<=', propBetween.lowerThanEqualTo);
				if ('greaterThan' in propBetween)
					query.where(propBetween.property, '>', propBetween.greaterThan);
				if ('lowerThan' in propBetween)
					query.where(propBetween.property, '<', propBetween.lowerThan);
			});
		}

		if (params.whereIn) {
			const { whereIn } = params;
			const whereIns = Array.isArray(whereIn) ? whereIn : [whereIn];

			whereIns.forEach(param => {
				const { property, values } = param;
				query.whereIn(property, values);
			});
		}

		if (params.whereJsonSupersetOf) {
			const { property, values } = params.whereJsonSupersetOf;
			query.where(function () {
				const [val0, ...remValues] = Array.isArray(values) ? values : [values];
				this.whereJsonSupersetOf(property, [val0]);
				// eslint-disable-next-line implicit-arrow-linebreak
				remValues.forEach(value =>
					// eslint-disable-next-line implicit-arrow-linebreak
					this.orWhere(function () {
						this.whereJsonSupersetOf(property, [value]);
					}),
				);
			});
		}

		if (params.whereNotIn) {
			const { column, values } = params.whereNotIn;
			query.whereNotIn(column, values);
		}

		if (params.whereNot) {
			const { column, value } = params.whereNot;
			query.whereNot(column, value);
		}

		if (params.whereBetween) {
			const { column, values } = params.whereBetween;
			query.whereBetween(column, values);
		}

		if (params.andWhere) {
			const { andWhere } = params;
			query.where(function () {
				this.where(andWhere);
			});
		}

		if (params.orWhere) {
			const { orWhere, orWhereWith } = params;
			query.where(function () {
				this.where(orWhere).orWhere(orWhereWith);
			});
		}

		if (params.orWhereIn) {
			const { property, values } = params.orWhereIn;
			query.orWhereIn(property, values);
		}

		if (params.leftOuterJoin) {
			params.leftOuterJoin = Array.isArray(params.leftOuterJoin)
				? params.leftOuterJoin
				: [params.leftOuterJoin];

			params.leftOuterJoin.forEach(join => {
				const { targetTable, leftColumn, rightColumn } = join;
				query.leftOuterJoin(targetTable, leftColumn, rightColumn);
			});
		}

		if (params.rightOuterJoin) {
			params.rightOuterJoin = Array.isArray(params.rightOuterJoin)
				? params.rightOuterJoin
				: [params.rightOuterJoin];

			params.rightOuterJoin.forEach(join => {
				const { targetTable, leftColumn, rightColumn } = join;
				query.rightOuterJoin(targetTable, leftColumn, rightColumn);
			});
		}

		if (params.innerJoin) {
			params.innerJoin = Array.isArray(params.innerJoin) ? params.innerJoin : [params.innerJoin];

			params.innerJoin.forEach(join => {
				const { targetTable, leftColumn, rightColumn } = join;
				query.innerJoin(targetTable, leftColumn, rightColumn);
			});
		}

		if (params.search) {
			params.search = Array.isArray(params.search) ? params.search : [params.search];

			params.search.forEach(search => {
				const { property, pattern, startsWith, endsWith, allowWildCards } = search;
				if (allowWildCards === true) {
					if (pattern) query.where(`${property}`, 'like', `%${pattern}%`);
					if (startsWith) query.where(`${property}`, 'like', `${startsWith}%`);
					if (endsWith) query.where(`${property}`, 'like', `%${endsWith}`);
				} else {
					if (pattern) query.where(`${property}`, 'like', `%${escapeUserInput(pattern)}%`);
					if (startsWith) query.where(`${property}`, 'like', `${escapeUserInput(startsWith)}%`);
					if (endsWith) query.where(`${property}`, 'like', `%${escapeUserInput(endsWith)}`);
				}
			});
		}

		if (params.orSearch) {
			params.orSearch = Array.isArray(params.orSearch) ? params.orSearch : [params.orSearch];

			query.andWhere(function () {
				params.orSearch.forEach((orSearch, index) => {
					const { property, pattern, startsWith, endsWith, allowWildCards } = orSearch;

					if (index === 0) {
						if (allowWildCards === true) {
							if (pattern) this.where(`${property}`, 'like', `%${pattern}%`);
							if (startsWith) this.where(`${property}`, 'like', `${startsWith}%`);
							if (endsWith) this.where(`${property}`, 'like', `%${endsWith}`);
						} else {
							if (pattern) this.where(`${property}`, 'like', `%${escapeUserInput(pattern)}%`);
							if (startsWith) this.where(`${property}`, 'like', `${escapeUserInput(startsWith)}%`);
							if (endsWith) this.where(`${property}`, 'like', `%${escapeUserInput(endsWith)}`);
						}
					} else if (allowWildCards === true) {
						if (pattern) this.orWhere(`${property}`, 'like', `%${pattern}%`);
						if (startsWith) this.orWhere(`${property}`, 'like', `${startsWith}%`);
						if (endsWith) this.orWhere(`${property}`, 'like', `%${endsWith}`);
					} else {
						if (pattern) this.orWhere(`${property}`, 'like', `%${escapeUserInput(pattern)}%`);
						if (startsWith) this.orWhere(`${property}`, 'like', `${escapeUserInput(startsWith)}%`);
						if (endsWith) this.orWhere(`${property}`, 'like', `%${escapeUserInput(endsWith)}`);
					}
				});
			});
		}

		if (params.whereNull) {
			params.whereNull = Array.isArray(params.whereNull) ? params.whereNull : [params.whereNull];

			params.whereNull.forEach(whereNullProperty => {
				query.whereNull(whereNullProperty);
			});
		}

		if (params.whereNotNull) {
			params.whereNotNull = Array.isArray(params.whereNotNull)
				? params.whereNotNull
				: [params.whereNotNull];

			params.whereNotNull.forEach(whereNotNullProperty => {
				query.whereNotNull(whereNotNullProperty);
			});
		}

		return query;
	};

	const deleteByParams = async (params, trx) => {
		let isDefaultTrx = false;
		if (!trx) {
			trx = await createDefaultTransaction(knex);
			isDefaultTrx = true;
		}

		const query = queryBuilder(params, tableConfig.primaryKey, false, trx).del();
		if (isDefaultTrx)
			return query
				.then(async result => {
					await trx.commit();
					return result;
				})
				.catch(async err => {
					await trx.rollback();
					logger.error(err.message);
					throw err;
				});
		return query;
	};

	const deleteByPrimaryKey = async (ids, trx) => {
		let isDefaultTrx = false;
		if (!trx) {
			trx = await createDefaultTransaction(knex);
			isDefaultTrx = true;
		}

		ids = Array.isArray(ids) ? ids : [ids];
		const query = knex(tableName).transacting(trx).whereIn(primaryKey, ids).del();
		if (isDefaultTrx)
			return query
				.then(async result => {
					await trx.commit();
					return result;
				})
				.catch(async err => {
					await trx.rollback();
					logger.error(err.message);
					throw err;
				});
		return query;
	};

	const update = async (params, trx) => {
		let isDefaultTrx = false;
		if (!trx) {
			trx = await createDefaultTransaction(knex);
			isDefaultTrx = true;
		}

		const { where, updates } = params;
		const query = queryBuilder({ ...where }, tableConfig.primaryKey, false, trx).update({
			...updates,
		});

		if (isDefaultTrx)
			return query
				.then(async result => {
					await trx.commit();
					return result;
				})
				.catch(async err => {
					await trx.rollback();
					logger.error(err.message);
					throw err;
				});
		return query;
	};

	const find = async (params = {}, columns, trx) => {
		let isDefaultTrx = false;
		if (!trx) {
			trx = await createDefaultTransaction(knex);
			isDefaultTrx = true;
		}

		if (!columns) {
			logger.trace(
				`No SELECT columns specified in the query, returning the '${tableName}' table primary key: '${tableConfig.primaryKey}.'`,
			);
			columns = Array.isArray(tableConfig.primaryKey)
				? tableConfig.primaryKey
				: [tableConfig.primaryKey];
		}
		const query = queryBuilder(params, columns, false, trx);
		const debugSql = query.toSQL().toNative();
		logger.debug(`${debugSql.sql}; bindings: ${debugSql.bindings}.`);

		if (isDefaultTrx)
			return query
				.then(async response => {
					await trx.commit();
					return response;
				})
				.catch(async err => {
					await trx.rollback();
					logger.error(err.message);
					throw err;
				});

		return query;
	};

	const count = async (params = {}, column, trx) => {
		let isDefaultTrx = false;
		if (!trx) {
			trx = await createDefaultTransaction(knex);
			isDefaultTrx = true;
		}

		if (!column) {
			logger.trace(
				`No SELECT columns specified in the query, returning the '${tableName}' table primary key: '${tableConfig.primaryKey}.'`,
			);
			column = Array.isArray(tableConfig.primaryKey)
				? [tableConfig.primaryKey[0]]
				: [tableConfig.primaryKey];
		} else {
			column = Array.isArray(column) ? [column[0]] : [column];
		}

		const query = queryBuilder(params, column, true, trx);
		const debugSql = query.toSQL().toNative();
		logger.debug(`${debugSql.sql}; bindings: ${debugSql.bindings}.`);

		if (isDefaultTrx)
			return query
				.then(async result => {
					await trx.commit();
					const [totalCount] = result;
					return totalCount.count;
				})
				.catch(async err => {
					await trx.rollback();
					logger.error(err.message);
					throw err;
				});

		return query;
	};

	const rawQuery = async (queryStatement, trx) => {
		let isDefaultTrx = false;
		if (!trx) {
			trx = await createDefaultTransaction(knex);
			isDefaultTrx = true;
		}

		const query = trx.raw(queryStatement);

		if (isDefaultTrx)
			return query
				.then(async result => {
					await trx.commit();
					const [resultSet] = result;
					return resultSet;
				})
				.catch(async err => {
					await trx.rollback();
					logger.error(err.message);
					throw err;
				});

		return query;
	};

	const increment = async (params, trx) => {
		let isDefaultTrx = false;
		if (!trx) {
			trx = await createDefaultTransaction(knex);
			isDefaultTrx = true;
		}

		const query = queryBuilder(params, false, false, trx).increment(params.increment);

		if (isDefaultTrx)
			return query
				.then(async result => {
					await trx.commit();
					return result;
				})
				.catch(async err => {
					await trx.rollback();
					logger.error(err.message);
					throw err;
				});
		return query;
	};

	const decrement = async (params, trx) => {
		let isDefaultTrx = false;
		if (!trx) {
			trx = await createDefaultTransaction(knex);
			isDefaultTrx = true;
		}

		const query = queryBuilder(params, false, false, trx).decrement(params.decrement);

		if (isDefaultTrx)
			return query
				.then(async result => {
					await trx.commit();
					return result;
				})
				.catch(async err => {
					await trx.rollback();
					logger.error(err.message);
					throw err;
				});
		return query;
	};

	return {
		upsert,
		insert,
		find,
		delete: deleteByParams,
		deleteByPrimaryKey,
		update,
		count,
		rawQuery,
		increment,
		decrement,
	};
};

module.exports = {
	startDBTransaction,
	commitDBTransaction,
	rollbackDBTransaction,
	getTableInstance,
	loadSchema,
	escapeUserInput,
};
