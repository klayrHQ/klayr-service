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
import Joi from 'joi';

const marketPriceSchema = {
	code: Joi.string().required(),
	from: Joi.string().required(),
	rate: Joi.string().required(),
	to: Joi.string().required(),
	updateTimestamp: Joi.number().integer().positive().required(),
	sources: Joi.array().items(Joi.string().required()).required(),
};

const marketPriceMetaSchema = {
	count: Joi.number().integer().min(0).required(),
};

module.exports = {
	marketPriceSchema: Joi.object(marketPriceSchema).required(),
	marketPriceMetaSchema: Joi.object(marketPriceMetaSchema).required(),
};
