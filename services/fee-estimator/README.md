# Klayr Service Fee Estimator

The Fee Estimator service is primarily responsible to implement the [Dynamic Fee](https://github.com/KlayrHQ/lips/blob/main/proposals/lip-0013.md) proposal. It implements the algorithm specified in [LIP-0016](https://github.com/KlayrHQ/lips/blob/main/proposals/lip-0016.md) and provides estimates based on the network activity.

> Note that this installation instruction is required only for development activities. For a regular Klayr Service user the official [documentation](https://klayr.xyz/documentation/klayr-service/) is sufficient to run an instance. The global readme file present in the root directory covers running all the microservices simultaneously.

## Installation

### Prerequisites

Please refer to the [README](../../README.md) in the project root directory.

## Installation

Clone the Klayr Service Repository:

```bash
git clone https://github.com/KlayrHQ/klayr-service.git # clone repository
cd klayr-service/services/fee-estimator # move into fee-estimator microservice directory
yarn install --frozen-lockfile # install required Node.js dependencies
```

## Configuration

To configure the different microservices, there are several environment variables the user can define to customize the configurations.

A list of the most commonly used environment variables is presented below:

- `SERVICE_BROKER`: URL of the microservice message broker (NATS or Redis).
- `SERVICE_FEE_ESTIMATOR_CACHE`: URL of the cache storage (Redis).
- `ENABLE_FEE_ESTIMATOR_QUICK`: Boolean flag to enable quick algorithm.
- `ENABLE_FEE_ESTIMATOR_FULL`: Boolean flag to enable full algorithm.
- `FEE_EST_COLD_START_BATCH_SIZE`: Number of blocks analyzed during cold start.
- `FEE_EST_DEFAULT_START_BLOCK_HEIGHT`: Block height at which fee estimation algorithm starts running. By default, it starts at the genesis height in full mode and the current block height at the moment of application initialization in the quick mode.
- `FEE_EST_EMA_BATCH_SIZE`: Estimated moving average algorithm batch size.
- `FEE_EST_EMA_DECAY_RATE`: Estimated moving average algorithm decay rate.
- `FEE_EST_WAVG_DECAY_PERCENTAGE`: Estimated moving average algorithm weighted average decay percentage.

> **Note**: `interval` takes priority over `schedule` and must be greater than 0 to be valid for all the moleculer job configurations.

## Management

### Start

```bash
cd klayr-service/services/fee-estimator # move into the root directory of the fee-estimator microservice
yarn start # start the microservice with running nodes locally
```

Use the `framework/bin/moleculer_client.js` and `framework/bin/moleculer_subscribe.js` clients to test particular service endpoints.

If you want to run a production variant of the service, use `Docker` or `PM2`. This will automatically recover the process when it fails.

### Stop

Press `Ctrl+C` in the terminal to stop the process.

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
