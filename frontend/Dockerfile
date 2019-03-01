FROM node:8-alpine

ADD . /app
WORKDIR /app
RUN apk add --no-cache libc6-compat git && npm install -g -s --no-progress yarn && \
    yarn
#   && \
#    yarn build && \
#    yarn cache clean