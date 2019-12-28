FROM node:12-alpine as build-deps

# ENV PACKAGES="\
#     libc6-compat \
#     build-base \
#     git \
#     "
    
# RUN apk add $PACKAGES

RUN mkdir /app
WORKDIR /app
COPY package.json yarn.lock ./

RUN yarn

COPY . ./
# RUN yarn build