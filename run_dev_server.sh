#!/usr/bin/env bash
export FLASK_APP=radio/api.py
export FLASK_DEBUG=1
export FLASK_ENV=development
~/.virtualenvs/radio/bin/flask run
