#!/usr/bin/env bash
~/.virtualenvs/radio/bin/python generate_icecast_xml.py
icecast -b -c icecast.xml
~/.virtualenvs/radio/bin/python stream.py transcode
