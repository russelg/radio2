# radio2

A suite of software (comprised of Icecast, a REST API backend and a React frontend) which enables users to participate in a community radio.
There is included functionality to request, favourite, upload and download songs.

## Installing/Running the radio

:warning: **By default the first user to register becomes an admin, so please register an account to use for admin purposes before you expose the website to the public internet.** :warning:

---

### Using Docker

I have included Docker configs which should allow you to get this running fairly simply.

- Install `docker` and `docker-compose`.
- Copy `radio/config.sample-docker.py` to `radio/config.py`. This sample config is pre-configured with the correct URLs for the database and icecast.
- Run `python generate_icecast_xml.py` to generate the necessary environment files. This should run with any recent version of python (without dependencies).
- Run `docker-compose build`. This might take a while depending on internet speed.
- Run `docker-compose run -w '/app/radio/pylibshout' server python build.py` to build pylibshout.
- Run `docker-compose run -w '/app' server python batch_add.py` to populate the database with any songs that exist in the music directories.
- Finally start the whole stack by running `docker-compose up`.

---

### Manually

- Install `icecast` (2.4.1 or above).
- Make sure you have working installation of Python **3.6** or higher, if not install it.
- Install `pipenv` (`pip install pipenv`)
- Install dependencies using: `pipenv install`
- Copy `radio/config.sample.py` to `radio/config.py` and edit the placeholder values.

A Caddy config is included to get started quickly.

#### Stream

```sh
python generate_icecast_xml.py
icecast -b -c icecast.xml
pipenv run python stream.py
```

#### API Server

Production:

```sh
pipenv run gunicorn -b 0.0.0.0:5000 radio.api:app
```

Development:

```sh
export FLASK_APP=radio/api.py
export FLASK_DEBUG=1
export FLASK_ENV=development
pipenv run flask run
```

#### Frontend

Production:

```sh
yarn build
```

Development:

```sh
yarn start
```
