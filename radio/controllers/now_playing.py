import collections
from dataclasses import dataclass
from urllib.parse import unquote

import arrow
import flask_restful as rest
from flask import Blueprint, Response, request
from pony.orm import db_session, desc, select
from radio import app
from radio.common.utils import (
    get_folder_size,
    get_self_links,
    make_api_response,
    parse_status,
)
from radio.models import Queue, Song

blueprint = Blueprint("np", __name__)
api = rest.Api(blueprint)


@dataclass
class SongTimes:
    now: arrow.arrow.Arrow = arrow.now()
    start: arrow.arrow.Arrow = now
    current = 0
    length = 0
    end: arrow.arrow.Arrow = now


@dataclass
class DummySong:
    length = 0
    artist = ""
    title = ""
    id = ""


@db_session
def np() -> dict:
    listeners_count = 0

    mounts = ["ogg"]
    if app.config["ICECAST_TRANSCODE"]:
        mounts.append("mp3")

    for mount in mounts:
        url = "http://{ICECAST_HOST}:{ICECAST_PORT}{ICECAST_MOUNT}.{ext}.xspf".format(
            **app.config, ext=mount
        )
        listeners_count += int(parse_status(url).get("Current Listeners", 0))

    lastplayed_rows = (
        Song.select(lambda c: c.lastplayed).sort_by(desc(Song.lastplayed)).limit(6)
    )

    times = SongTimes()
    if lastplayed_rows:
        # current playing song is the first lastplayed entry
        top_row = lastplayed_rows[0]
        times.now = arrow.now()
        times.start = arrow.get(top_row.lastplayed)
        times.current = times.now - times.start
        times.length = top_row.length
        times.end = times.start.shift(seconds=times.length)
    else:
        top_row = DummySong()

    queue = []
    time_str = times.end
    for entry in Queue.select().prefetch(Queue.song).limit(10):
        queue.append(
            {
                "artist": entry.song.artist,
                "title": entry.song.title,
                "time": time_str.isoformat(),
                "timestamp": time_str.timestamp,
                "requested": entry.requested,
                "id": entry.song.id,
            }
        )
        time_str = time_str.shift(seconds=entry.song.length)

    lastplayed = []
    time_str = times.end.shift(seconds=-top_row.length)
    for song in lastplayed_rows[1:]:
        lastplayed.append(
            {
                "artist": song.artist,
                "title": song.title,
                "time": time_str.isoformat(),
                "timestamp": time_str.timestamp,
                "requested": False,
                "index": song.id,
            }
        )
        time_str = time_str.shift(seconds=-song.length)

    return {
        "len": times.length,
        "current": times.now.timestamp,
        "start_time": times.start.timestamp,
        "end_time": times.end.timestamp,
        "artist": top_row.artist,
        "title": top_row.title,
        "id": top_row.id,
        "requested": False,
        "queue": queue,
        "lp": lastplayed,
        "listeners": listeners_count,
        "total_songs": Song.select().count(),
        "total_plays": select(song.playcount for song in Song).sum(),
        "total_size": get_folder_size(path=app.config["PATH_MUSIC"]),
    }


css = collections.OrderedDict(sorted(app.config["CSS"].items()))
default_css = app.config["CSS"][app.config["DEFAULT_CSS"]]


def settings() -> dict:
    return {
        "css": unquote(request.cookies.get("stylesheet") or default_css),
        "styles": css,
        "icecast": {
            "mount": app.config["ICECAST_MOUNT"],
            "url": app.config["ICECAST_URL"],
        },
        "title": app.config["TITLE"],
        "downloads_enabled": app.config["PUBLIC_DOWNLOADS"],
        "uploads_enabled": app.config["PUBLIC_UPLOADS"],
    }


class NowPlayingController(rest.Resource):
    def get(self) -> Response:
        return make_api_response(
            200, None, content=dict(_links=get_self_links(api, self), **np())
        )


class SettingsController(rest.Resource):
    def get(self) -> Response:
        return make_api_response(
            200, None, content=dict(_links=get_self_links(api, self), **settings())
        )


api.add_resource(NowPlayingController, "/np", "/nowplaying")
api.add_resource(SettingsController, "/settings")
