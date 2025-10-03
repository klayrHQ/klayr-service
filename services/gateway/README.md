# Klayr Service Gateway

The Gateway service provides the API, which all users of Klayr Service can access and use. Its main purpose is to proxy the API requests from users to other services provided by Klayr Service. This provides the users with a central point of data access that never disrupts or breaks the existing application compatibility.

> Note that this installation instruction is required only for development activities. For a regular Klayr Service user, the official [documentation](https://klayr.xyz/documentation/klayr-service/) is sufficient to run an instance. The global readme file present in the root directory describes how to run all the microservices simultaneously.

## Installation

### Prerequisites

Please refer to the [README](../../README.md) in the project root directory.

## Installation

Clone the Klayr Service Repository:

```bash
git clone https://github.com/KlayrHQ/klayr-service.git # clone repository
cd klayr-service/services/gateway # move into gateway microservice directory
yarn install --frozen-lockfile # install required Node.js dependencies
```

## Configuration

To configure the different microservices, there are a number of environment variables the user can define in order to customize the configurations.

A list of the most commonly used environment variables is presented below:

| Environment variable | Description |
| -------------------- | ----------- |
| `PORT` | Port that provides the possibility to connect with Klayr Service. |
| `HOST` | URL of the host. |
| `SERVICE_BROKER` | URL of the microservice message broker (NATS or Redis). |
| `JSON_RPC_STRICT_MODE` | Ensures that JSON-RPC accepts a valid JSON-RPC 2.0 envelope. |
| `ENABLE_HTTP_API` | Enables particular HTTP API endpoints. |
| `ENABLE_WS_API` | Enables specified WebSocket API namespaces. |
| `SERVICE_GATEWAY_REDIS_VOLATILE` | URL of the volatile cache storage (Redis). |
| `GATEWAY_DEPENDENCIES` | Describes the microservices on which the `gateway` service depends. |
| `GATEWAY_ROUTES_CALL_TIMEOUT` | Timeout (in seconds) for API requests proxied from the gateway to other microservices. |
| `ENABLE_REVERSE_PROXY_TIMEOUT_SETTINGS` | Boolean flag to enforce the `headersTimeout` and `keepAliveTimeout` settings on the API server. |
| `HTTP_KEEP_ALIVE_TIMEOUT` | Defines the number of microseconds the gateway will wait before closing an idle connection. |
| `HTTP_HEADERS_TIMEOUT` | Defines the maximum number of microseconds for the gateway to send HTTP response headers after the client's request. |
| `WS_RATE_LIMIT_ENABLE` | To enable the WebSocket rate limit, this environment variable is required to be `true`. |
| `WS_RATE_LIMIT_CONNECTIONS` | Number of connections per second. |
| `WS_RATE_LIMIT_DURATION` | Defines the duration (in seconds) for which the WS rate should be limited. |
| `ENABLE_REQUEST_CACHING` | To enable RPC response caching, this environment variable is required to be `true`. |
| `REQUEST_CACHING_TTL` | Time-to-live for RPC cache entries. |
| `REQUEST_CACHING_EXCLUDE_LIST` | A comma-separated list of RPC methods to exclude from caching. |
| `HTTP_RATE_LIMIT_ENABLE` | To enable the HTTP rate limit, this environment variable is required to be `true`. |
| `HTTP_RATE_LIMIT_CONNECTIONS` | Defines the maximum number of HTTP requests during a period. |
| `HTTP_RATE_LIMIT_WINDOW` | Defines the time for which a record of requests should be kept in the memory (in seconds). |
| `ENABLE_HTTP_CACHE_CONTROL` | To enable response caching, this environment variable is required to be `true`. |
| `HTTP_CACHE_CONTROL_DIRECTIVES` | The `Cache-Control` HTTP directive can be overridden with this environment variable. |
| `CORS_ALLOWED_ORIGIN` | Allows request from the comma-separated string of origins. |
| `HTTP_RATE_LIMIT_ENABLE_X_FORWARDED_FOR` | When set to true, the rate-limiting algorithm considers the `X-Forwarded-For` header value to determine the client's IP address for rate-limiting purposes. |
| `HTTP_RATE_LIMIT_NUM_KNOWN_PROXIES` | Defines the number of proxies that exist between the gateway and the external client application, enabling accurate identification of the client's IP address for rate-limiting. |
| `JOB_INTERVAL_UPDATE_READINESS_STATUS` | Job run interval to update the readiness status. |
| `JOB_SCHEDULE_UPDATE_READINESS_STATUS` | Job run cron schedule to update the readiness status. |

> **Note**: `interval` takes priority over `schedule` and must be greater than 0 to be valid for all the moleculer job configurations.

The variables listed above can be universally overridden by using global variables.

```bash
export ENABLE_HTTP_API="http-status,http-version3"
```

### Examples

```bash
# Run local instance with HTTP API only
ENABLE_HTTP_API="http-status,http-version3" \
ENABLE_WS_API="" \
CORS_ALLOWED_ORIGIN="https://www.host1.com,https://www.host2.com" \
node app.js
```

```bash
# Run a local instance with the RPC API in a strict mode and using HTTP
ENABLE_HTTP_API="http-status,http-version3" \
ENABLE_WS_API="blockchain,rpc-v3" \
CORS_ALLOWED_ORIGIN="https://www.host1.com,https://www.host2.com" \
JSON_RPC_STRICT_MODE="true" \
node app.js
```

## Management

### Start

```bash
cd klayr-service/services/gateway # navigate into the root directory of the gateway microservice
yarn start # start the microservice with running nodes locally
```

Use the `framework/bin/moleculer_client.js` and `framework/bin/moleculer_subscribe.js` clients to test particular service endpoints.

If you want to run a production variant of the service use `Docker` or `PM2`. In the event whereby the process fails, it will be automatically recovered.

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
