FROM python:3.7.2-alpine

ENV PACKAGES="\
    dumb-init \
    musl-dev \
    postgresql-dev \
    libc6-compat \
    linux-headers \
    build-base \
    ca-certificates \
    libgcc \
    libstdc++ \
    openssl-dev \
    libffi-dev \
    libshout-dev \
    ffmpeg \
    "

# VOLUME [ "/app" ]

ADD . /app
WORKDIR /app

RUN apk add --no-cache --virtual build-dependencies $PACKAGES \
    && pip install pipenv \
    && cd /app/radio \
    && pipenv install --system --deploy