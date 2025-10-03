# Klayr Service Market

The Market service allows price data retrieval. It supports multiple sources to keep the current Klayr token price up-to-date and available to the clients in real-time.

> Note that this installation instruction is required only for development activities. For a regular Klayr Service user the official [documentation](https://klayr.xyz/documentation/klayr-service/) is sufficient to run an instance. The global readme file present in the root directory describes running all the microservices simultaneously.

## Installation

### Prerequisites

Please refer to the [README](../../README.md) in the project root directory.

## Installation

Clone the Klayr Service Repository:

```bash
git clone https://github.com/KlayrHQ/klayr-service.git # clone repository
cd klayr-service/services/market # move into market microservice directory
yarn install --frozen-lockfile # install required Node.js dependencies
```

## Configuration

To configure the different microservices, there are several environment variables the user can define to customize the configurations.

A list of the most commonly used environment variables is presented below:

| Environment variable | Description |
| -------------------- | ----------- |
| `SERVICE_BROKER` | URL of the microservice message broker (NATS or Redis). |
| `SERVICE_MARKET_REDIS` | URL of the cache storage (Redis). |
| `SERVICE_MARKET_FIAT_CURRENCIES` | Fiat currencies are used for price calculation. |
| `SERVICE_MARKET_TARGET_PAIRS` | Exchange rates exposed to the Gateway. |
| `EXCHANGERATESAPI_IO_API_KEY` | Optional API key for https://exchangeratesapi.io/. |
| `JOB_INTERVAL_REFRESH_PRICES_BINANCE` | Job run interval to refresh prices from Binance. |
| `JOB_SCHEDULE_REFRESH_PRICES_BINANCE` | Job run cron schedule to refresh prices from Binance. |
| `JOB_INTERVAL_REFRESH_PRICES_EXCHANGERATESAPI` | Job run interval to refresh prices from exchangeratesapi. |
| `JOB_SCHEDULE_REFRESH_PRICES_EXCHANGERATESAPI` | Job run cron schedule to refresh prices from exchangeratesapi. |
| `JOB_INTERVAL_REFRESH_PRICES_BITRUE` | Job run interval to refresh prices from Bittrue. |
| `JOB_SCHEDULE_REFRESH_PRICES_BITRUE` | Job run cron schedule to refresh prices from Bittrue. |
| `JOB_INTERVAL_UPDATE_PRICES` | Job run interval to update market prices. |
| `JOB_SCHEDULE_UPDATE_PRICES` | Job run cron schedule to update market prices. |
| `JOB_INTERVAL_REFRESH_PRICES_PROBIT` | Job run interval to refresh prices from ProBit. |
| `JOB_SCHEDULE_REFRESH_PRICES_PROBIT` | Job run cron schedule to refresh prices from ProBit. |

> **Note**: `interval` takes priority over `schedule` and must be greater than 0 to be valid for all the moleculer job configurations.

## Management

### Start

```bash
cd klayr-service/services/market # move into the root directory of the market microservice
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
