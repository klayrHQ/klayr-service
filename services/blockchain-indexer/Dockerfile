FROM node:16-alpine AS builder

RUN apk add --no-cache alpine-sdk python2 git libtool autoconf automake
RUN adduser -D builder

USER builder
RUN mkdir /home/builder/build
WORKDIR /home/builder/build

COPY ./package-lock.json ./package.json ./.npmrc ./
RUN npm ci


FROM node:16-alpine

RUN apk add --no-cache curl mysql-client
RUN adduser -D lisk

COPY ./ /home/lisk/lisk-service/blockchain-indexer/
RUN chown -R lisk:lisk /home/lisk/
COPY --from=builder /home/builder/build/node_modules/ /home/lisk/lisk-service/blockchain-indexer/node_modules/

USER lisk
WORKDIR /home/lisk/lisk-service/blockchain-indexer
CMD ["node", "app.js"]