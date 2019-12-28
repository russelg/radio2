FROM python:3.7-alpine

ENV APP=/app \
    PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_VERSION=1.0.0


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


EXPOSE 80

RUN apk add $PACKAGES \
    && pip install "poetry==$POETRY_VERSION"

RUN mkdir $APP && mkdir $APP/radio

WORKDIR /pysetup
COPY ./poetry.lock* ./pyproject.toml /pysetup/
COPY radio/pylibshout /pysetup/pylibshout
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi
WORKDIR /pysetup/pylibshout
RUN poetry run python setup.py install

WORKDIR $APP
COPY . $APP