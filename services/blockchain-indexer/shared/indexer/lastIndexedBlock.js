const {
	DB: {
		MySQL: { getTableInstance },
	},
	CacheLRU,
} = require('klayr-service-framework');

const config = require('../../config');
const MYSQL_ENDPOINT = config.endpoints.mysqlReplica;

const blocksTableSchema = require('../database/schema/blocks');

const getBlocksTable = () => getTableInstance(blocksTableSchema, MYSQL_ENDPOINT);

const LAST_INDEXED_BLOCK_CACHE_KEY = 'lastIndexedBlock';
const lastIndexedBlockCache = CacheLRU('lastIndexedBlock', { max: 1 });

const getLastIndexedBlockFromDB = async () => {
	const blocksTable = await getBlocksTable();
	const [lastIndexedBlockFromDB] = await blocksTable.find(
		{
			sort: 'height:desc',
			limit: 1,
		},
		Object.getOwnPropertyNames(blocksTableSchema.schema),
	);
	if (lastIndexedBlockFromDB) await setLastIndexedBlock(lastIndexedBlockFromDB);
	return lastIndexedBlockFromDB;
};

const getLastIndexedBlock = async () => {
	const lastIndexedBlock = await lastIndexedBlockCache.get(LAST_INDEXED_BLOCK_CACHE_KEY);
	if (lastIndexedBlock) {
		return JSON.parse(lastIndexedBlock);
	} else {
		return await getLastIndexedBlockFromDB();
	}
};

const setLastIndexedBlock = async block => {
	if (block) {
		await lastIndexedBlockCache.set(
			LAST_INDEXED_BLOCK_CACHE_KEY,
			JSON.stringify({ id: block.id, height: block.height }),
		);
	} else {
		await getLastIndexedBlockFromDB();
	}
};

module.exports = { getLastIndexedBlock, setLastIndexedBlock };
