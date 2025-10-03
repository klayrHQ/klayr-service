# Klayr Service Blockchain Indexer

The Blockchain Indexer service, in the _indexing_ mode, is primarily responsible to index all the blockchain information, based on the scheduled jobs by the Blockchain Coordinator.
In the _data service_ mode, it serves user request queries made via the RESTful API or WebSocket-based RPC calls.
It can run both the indexer and data service modes simultaneously, and is enabled by default.

This microservice encapsulates most of the business logic for the Klayr Service API. By default, it only implements the business logic for all the available commands from the Klayr SDK.
The _applyTransaction_ and _revertTransaction_ hooks implement the indexing logic and are specific to each available command. The _applyTransaction_ is triggered when processing an included transaction within a new block while (usually) indexing the `chain_newBlock` event. The _revertTransaction_ hook is triggered when processing an included transaction within a deleted block while processing the `chain_deleteBlock` event. All the implemented hooks are grouped [here](./shared/indexer/transactionProcessor). Command specific hooks are always implemented within a single file and are grouped by the module. When interested in extending Klayr Service and implementing hooks for your custom modules, please check the [Extending Indexer](#extending-indexer) section below.

> Note that this installation instruction is required only for development activities. For a regular Klayr Service user the official [documentation](https://klayr.xyz/documentation/klayr-service/) is sufficient to run an instance. The global readme file present in the root directory describes running all the microservices at once.

## Installation

### Prerequisites

Please refer to the [README](../../README.md) in the project root directory.

## Installation

Clone the Klayr Service Repository:

```bash
git clone https://github.com/KlayrHQ/klayr-service.git # clone repository
cd klayr-service/services/blockchain-indexer # move into blockchain-indexer microservice directory
yarn install --frozen-lockfile # install required Node.js dependencies
```

## Configuration

To configure the different microservices, there are several environment variables the user can define to customize the configurations.

A list of the most commonly used environment variables is presented below:

| Environment variable | Description |
| -------------------- | ----------- |
| `SERVICE_BROKER` | URL of the microservice message broker (NATS or Redis). |
| `SERVICE_INDEXER_MYSQL` | Connection string for the primary MySQL (read/write) instance that the microservice connects to. |
| `SERVICE_MESSAGE_QUEUE_REDIS` | URL of the job queue to process the scheduled indexing jobs by the Blockchain Coordinator (Redis). |
| `SERVICE_INDEXER_REDIS_VOLATILE` | URL of the volatile cache storage (Redis). |
| `ENABLE_DATA_RETRIEVAL_MODE` | Boolean flag to enable the Data Service mode. |
| `ENABLE_INDEXING_MODE` | Boolean flag to enable the Data Indexing mode. |
| `SERVICE_INDEXER_CACHE_REDIS` | URL of the cache storage (Redis). |
| `SERVICE_INDEXER_MYSQL_READ_REPLICA` | Connection string for the replicated MySQL (read-only) instance that the microservice connects to. |
| `ENABLE_INDEXING_BENCHMARK` | Boolean flag to enable indexing benchmark. |
| `KLAYR_STATIC` | URL of Klayr static assets. |
| `JOB_INTERVAL_DELETE_SERIALIZED_EVENTS` | Job run interval to delete serialized events. |
| `JOB_SCHEDULE_DELETE_SERIALIZED_EVENTS` | Job run cron schedule to delete serialized events. |
| `JOB_INTERVAL_REFRESH_VALIDATORS` | Job run interval to refresh validators cache. |
| `JOB_SCHEDULE_REFRESH_VALIDATORS` | Job run cron schedule to refresh validators cache. |
| `JOB_INTERVAL_VALIDATE_VALIDATORS_RANK` | Job run interval to validate the rank for all the validators. |
| `JOB_SCHEDULE_VALIDATE_VALIDATORS_RANK` | Job run cron schedule to validate the rank for all the validators. |
| `JOB_INTERVAL_REFRESH_INDEX_STATUS` | Job run interval to refresh indexing status. |
| `JOB_SCHEDULE_REFRESH_INDEX_STATUS` | Job run cron schedule to refresh indexing status. |
| `JOB_INTERVAL_REFRESH_BLOCKCHAIN_APPS_STATS` | Job run interval to refresh blockchain application statistics. |
| `JOB_SCHEDULE_REFRESH_BLOCKCHAIN_APPS_STATS` | Job run cron schedule to refresh blockchain application statistics. |
| `JOB_INTERVAL_REFRESH_ACCOUNT_KNOWLEDGE` | Job run interval to refresh account knowledge. |
| `JOB_SCHEDULE_REFRESH_ACCOUNT_KNOWLEDGE` | Job run cron schedule to refresh account knowledge. |
| `JOB_INTERVAL_DELETE_FINALIZED_CCU_METADATA` | Job run interval to delete finalized CCU metadata. |
| `JOB_SCHEDULE_DELETE_FINALIZED_CCU_METADATA` | Job run cron schedule to delete finalized CCU metadata. |
| `JOB_INTERVAL_TRIGGER_ACCOUNT_UPDATES` | Job run interval to trigger account updates. |
| `JOB_SCHEDULE_TRIGGER_ACCOUNT_UPDATES` | Job run cron schedule to trigger account updates. |
| `GET_GENERATORS_LIMIT` | The number of generators that each block will retrieve to update on generators.change. |
| `INDEX_BLOCKS_RETRY_DELAY` | The delay in milliseconds before retrying to index a block to reduce node stress. |
| `INDEX_BLOCKS_QUEUE_SCHEDULED_JOB_MAX_COUNT` | Maximum number of jobs (in active and waiting state) allowed in the block indexing queue. |
| `MAINCHAIN_SERVICE_URL` | Mainchain service URL for custom deployments. |
| `ESTIMATES_BUFFER_BYTES_LENGTH` | Transaction buffer bytes to consider when estimating the transaction fees. |
| `DEVNET_MAINCHAIN_URL` | Devnet mainchain service URL for custom deployments. |
| `INVOKE_ALLOWED_METHODS` | List of allowed methods that can be invoked via the `/invoke` API endpoint. |
| `ENABLE_APPLY_SNAPSHOT` | Enable or disable auto-apply snapshot feature. |
| `DURABILITY_VERIFY_FREQUENCY` | Frequency in milliseconds to verify if a block is indexed or rolled-back successfully. |
| `INDEX_SNAPSHOT_URL` | Custom snapshot download URL (expected to end with sql.gz). |
| `ENABLE_SNAPSHOT_ALLOW_INSECURE_HTTP` | Boolean flag to enable downloading the snapshot from an (unsecured) HTTP URL. |

> **Note**: `interval` takes priority over `schedule` and must be greater than 0 to be valid for all the moleculer job configurations.

## Management

### Start

```bash
cd klayr-service/services/blockchain-indexer # move into the root directory of the blockchain-indexer microservice
yarn start # start the microservice with running nodes locally
```

Use the `framework/bin/moleculer_client.js` and `framework/bin/moleculer_subscribe.js` clients to test particular service endpoints.

If you want to run a production variant of the service, use `Docker` or `PM2`. This will automatically recover the process when it fails.

### Stop

Press `Ctrl+C` in the terminal to stop the process.

## Extending Indexer

The _applyTransaction_ and _revertTransaction_ hooks are arranged per command in a file and are grouped by the module that they belong to.<br />
Existing hooks are located in the [shared/indexer/transactionProcessor](./shared/indexer/transactionProcessor) directory.

When implementing the custom hooks please adhere to the following:

- Create a sub-directory with the module name. For example: [token](./shared/indexer/transactionProcessor/token).
- Add `index.js` under the above directory.
  - Export a `MODULE_NAME` variable. The value must match the _module_ name as registered within the application.
- Create a file specific to the command for which you need to implement the custom hooks. For example: [transfer](./shared/indexer/transactionProcessor/token/transfer.js).
  - Export a `COMMAND_NAME` variable. The value must match the _command_ name as registered within the application.
  - Implement the custom logic for the `applyTransaction` and `revertTransaction` hooks.
  - Export the hooks.
- To aid your development, please use the sample templates [here](./shared/indexer/transactionProcessor/0_moduleName).

## Contributors

https://github.com/KlayrHQ/klayr-service/graphs/contributors

## License

Copyright 2016-2023 Lisk Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

[klayr documentation site]: https://klayr.xyz/documentation
