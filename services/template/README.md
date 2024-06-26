# Klayr Service Template

The Template service is an abstract service that all of Klayr Service services are inherited from. It allows all services to share a similar interface and design pattern. Its purpose is to reduce code duplication and increase consistency between each service, hence simplifying code maintenance and testing.

> Note that this installation instruction is required only for development activities. For a regular Klayr Service user, the official [documentation](https://klayr.xyz/documentation/klayr-service/) is sufficient to run an instance. The global readme file present in the root directory describes how to run all the microservices simultaneously.

## Installation

### Prerequisites

Please refer to the [README](../../README.md) in the project root directory.

## Installation

Clone the Klayr Service Repository:

```bash
git clone https://github.com/KlayrHQ/klayr-service.git # clone repository
cd klayr-service/services/template # move into template microservice directory
yarn install --frozen-lockfile # install required Node.js dependencies
```

## Configuration

To configure the different microservices, there are several environment variables the user can define to customize the configurations.
The template service does not use any of them by default.

## Management

### Start

```bash
cd klayr-service/services/template # move into the root directory of the template microservice
yarn start # start the microservice
```

Use the `framework/bin/moleculer_client.js` and `framework/bin/moleculer_subscribe.js` clients to test specific service endpoints.

Once the process is verified as running correctly, press `CTRL+C` and start the process with `PM2`. This will fork the process into the background and automatically recover the process if it fails.

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
