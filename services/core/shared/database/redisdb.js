/*
 * LiskHQ/lisk-service
 * Copyright © 2019 Lisk Foundation
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

const redis = require('ioredis');
const { Logger } = require('lisk-service-framework');

const config = require('../../config');

const logger = Logger();

const getDbInstance = async (collectionName) => {
    const db = new redis(config.endpoints.redis);

    db.on('error', (err) => {
        logger.error('connection issues ', err);
    });

    const write = async (doc) => {
        await db.set(doc.id, JSON.stringify(doc));
    };

    const writeBatch = async (docs) => {
        await Promise
            .all(docs.map((doc) => db.hmset(collectionName, doc.id, JSON.stringify(doc))));
    };

    // const findById = async (id) => await db.get(id);
    const findById = (id) => new Promise(resolve => {
        db.hgetall(collectionName, async (err, result) => {
            const res = {};
            if (result && result[id]) {
                Object.assign(res, JSON.parse(result[id]));
                return resolve([res]);
            }
            return resolve([]);
        });
    });

    const find = (params) => new Promise((resolve) => {
        db.hgetall(collectionName, async (err, result) => {
            let res = Object.keys(result).map((key) => JSON.parse(result[key]));
            res = res.filter(
                (item) => (item.address && item.address === params.selector.address)
                    || (item.publicKey && item.publicKey === params.selector.publicKey)
                    || (item.secondPublicKey
                        && item.secondPublicKey === params.selector.secondPublicKey)
                    || (item.username && item.username === params.selector.username),
            );
            return resolve(res);
        });
    });

    const findAll = () => new Promise(resolve => {
        db.hgetall(collectionName, async (err, result) => {
            const res = Object.keys(result).map((key) => JSON.parse(result[key]));
            return resolve(res);
        });
    });

    return {
        write,
        find,
        writeBatch,
        findAll,
        findById,
    };
};
module.exports = getDbInstance;
