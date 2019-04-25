FROM node:8-alpine

RUN mkdir -p /app
ADD .yarn_cache /usr/local/share/.cache/yarn/v1/
ADD ./package.json ./yarn.* /tmp/
RUN cd /tmp && apk add build-base libc6-compat git && npm install -g -s --no-progress yarn && yarn
RUN cd /app && ln -s /tmp/node_modules /app/node_modules

ADD . /app
WORKDIR /app