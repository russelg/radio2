# radio2

A suite of combined software to provide a community radio station.
Uses icecast as the streaming server.

## Installation Instructions

- Install `icecast` (2.4.1 or above).
- Make sure you have working installation of Python 3.6 or higher, if not install it.
- Create a virtualenv: `python -m venv venv`.
- Activate virtualenv
  - Windows : `venv\Scripts\activate`
  - Mac and Ubuntu : `. venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

## Running the radio

First, copy `radio/config.sample.py` to `radio/config.py`, then edit the values. The PostgreSQL database must exist prior to running the server.

Also make sure your virtualenv is activated before running the server.

A Caddy config is included to get started quickly.

:warning: **By default the first user to register becomes an admin, so please register an account to use for admin purposes before you expose the website to the public internet.** :warning:

### Stream

```sh
python generate_icecast_xml.py
icecast -b -c icecast.xml
python stream.py
```

### API Server

Production:

```sh
gunicorn -b 0.0.0.0:5000 radio.api:app
```

Development:

```sh
export FLASK_APP=radio/api.py
export FLASK_DEBUG=1
export FLASK_ENV=development
flask run
```

### Frontend

Production:

```sh
yarn build
```

Development:

```sh
yarn start
```
