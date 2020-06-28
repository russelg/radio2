FROM python:3.8-alpine

ENV APP=/app \
    PYTHONFAULTHANDLER=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    POETRY_VERSION=1.0.5


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

# The following is courtesy of https://github.com/python-poetry/poetry/issues/1301#issuecomment-609009714

# Currently poetry install is significantly slower than pip install, so we're creating a
# requirements.txt output and running pip install with it.
# Follow this issue: https://github.com/python-poetry/poetry/issues/338
# Setting --without-hashes because of this issue: https://github.com/pypa/pip/issues/4995
RUN poetry config virtualenvs.create false \
                && poetry export --without-hashes -f requirements.txt --dev \
                |  poetry run pip install -r /dev/stdin \
                && poetry debug

# Because initially we only copy the lock and pyproject file, we can only install the dependencies
# in the RUN above, as the `packages` portion of the pyproject.toml file is not
# available at this point. Now, after the whole package has been copied in, we run `poetry install`
# again to only install packages, scripts, etc. (and thus it should be very quick).
# See this issue for more context: https://github.com/python-poetry/poetry/issues/1899
RUN poetry install --no-interaction

WORKDIR $APP
COPY . $APP
