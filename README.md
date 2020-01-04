# radio2

A suite of software (comprised of Icecast, a REST API backend and a React frontend) which enables users to participate in a community radio.
There is included functionality to request, favourite, upload and download songs.

This should (nearly) always be running at https://radio.sgfc.co.

## Installing/Running the Radio

There are two ways of running this software, through [Docker](#using-docker) or [manually](#manual-setup).

Please note I perform all development and deployment using the docker method, so the manual method may not work for you. Please submit a new issue if this is the case.

---

## :warning: Admin Account Warning :warning:

**By default the first user to register becomes an admin, so please register an account to use for admin purposes before you expose the website to the public internet.**

I have included a script which can create users. This can be used before going live to make sure the above point is not an issue.
Please use these scripts after all dependencies have been set up (i.e. after docker images are built or poetry packages are installed).

If you are using docker, run `docker-compose run server python -m tools.create_user <username> -p <password> --admin`.

If you are using the manual method, run `poetry run python -m tools.create_user <username> -p <password> --admin`.

Replace `<username>` and `<password>` with the desired user details.

---

## Using Docker

I have included Docker configs which should allow you to get this running fairly simply.

-   Install `docker` and `docker-compose`.
-   Copy `radio/config.sample-docker.py` to `radio/config.py`. This sample config is pre-configured with the correct URLs for the database and icecast.
-   Run `make init`. This might take a while depending on internet speed.
-   Run `make batch-add` to populate the database with any songs that exist in the music directories.
-   Finally start the whole stack by running `docker-compose up`.

This configuration includes a Caddy service, which will listen on port 80 or 443. If you would like to use your own HTTP server, run this command instead of the above one:
`docker-compose up --scale caddy=0`

Also included is a config for development, which can be used as so:
`docker-compose -f docker-compose.yml -f docker-compose.dev.yml <command>`

## Manual Setup

-   Install `icecast` (2.4.1 or above).
-   Install PostgreSQL for the database.
-   Make sure you have working installation of Python **3.6** or higher, if not install it.
-   Install `poetry` (`pip install poetry`)
-   Install dependencies using: `poetry install`
-   Copy `radio/config.sample.py` to `radio/config.py` and edit the placeholder values.

A Caddy config is included to get started quickly.

#### Stream

```sh
python -m tools.generate_icecast_xml    # writes icecast.xml
icecast -b -c icecast.xml               # start icecast with generated xml
poetry run python -m radio.stream       # run the stream
```

#### API Server

Production:

```sh
poetry run gunicorn -b 0.0.0.0:5000 radio.api:app   # serve app with gunicorn
```

Development:

```sh
export FLASK_APP=radio/api.py
export FLASK_DEBUG=1
export FLASK_ENV=development
poetry run flask run    # serve app using flask's server
```

#### Frontend

Production:

```sh
yarn run build
```

Development:

```sh
yarn run start
```
