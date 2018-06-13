#!/usr/bin/env bash
~/.virtualenvs/radio/bin/gunicorn -b 0.0.0.0:5000 radio.api:app
