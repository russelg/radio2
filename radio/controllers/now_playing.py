import collections
from dataclasses import dataclass
from urllib.parse import unquote

import arrow
import flask_restful as rest
from flask import Blueprint, Response, request
from pony.orm import db_session, desc, select
from pony.orm.core import Query

from radio import app
from radio.common.utils import (
    get_folder_size,
    get_self_links,
    make_api_response,
    parse_status,
)
from radio.database import Queue, Song

blueprint = Blueprint("np", __name__)
api = rest.Api(blueprint)


@dataclass
class SongTimes:
    now: arrow.arrow.Arrow = arrow.now()
    start = now
    end = now
    current = 0
    length = 0

    def set_from_song(self, song: Song):
        self.now = arrow.now()
        self.start = arrow.get(song.lastplayed)
        self.current = self.now - self.start
        self.length = song.length
        self.end = self.start.shift(seconds=self.length)


@dataclass
class DummySong:
    length = 0
    artist = ""
    title = ""
    id = ""


def get_listeners() -> int:
    listeners_count = 0
    formats = ["ogg"]
    if app.config["ICECAST_TRANSCODE"]:
        formats.append("mp3")
    for ext in formats:
        url = "http://{ICECAST_HOST}:{ICECAST_PORT}{ICECAST_MOUNT}.{ext}.xspf".format(
            **app.config, ext=ext
        )
        listeners_count += int(parse_status(url).get("Current Listeners", 0))
    return listeners_count


@db_session
def np() -> dict:
    lastplayed_songs: Query = (
        Song.select(lambda c: c.lastplayed).sort_by(desc(Song.lastplayed)).limit(6)
    )

    # used to calculate song timestamps
    times = SongTimes()
    if lastplayed_songs:
        # current playing song is the first lastplayed entry
        current_song = lastplayed_songs[0]
        times.set_from_song(current_song)
    else:
        current_song = DummySong()

    time = times.end
    queue = []
    for entry in Queue.select().prefetch(Queue.song).limit(10):
        queue.append(
            {
                "artist": entry.song.artist,
                "title": entry.song.title,
                "time": time.isoformat(),
                "timestamp": time.timestamp,
                "requested": entry.requested,
                "id": entry.song.id,
            }
        )
        time = time.shift(seconds=entry.song.length)

    time = times.end.shift(seconds=-current_song.length)
    lastplayed = []
    for song in lastplayed_songs[1:]:
        lastplayed.append(
            {
                "artist": song.artist,
                "title": song.title,
                "time": time.isoformat(),
                "timestamp": time.timestamp,
                "requested": False,
                "id": song.id,
            }
        )
        time = time.shift(seconds=-song.length)

    return {
        "len": times.length,
        "current": times.now.timestamp,
        "start_time": times.start.timestamp,
        "end_time": times.end.timestamp,
        "artist": current_song.artist,
        "title": current_song.title,
        "id": current_song.id,
        "requested": False,
        "queue": queue,
        "lp": lastplayed,
        "listeners": get_listeners(),
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


@api.resource("/np", "/nowplaying")
class NowPlayingController(rest.Resource):
    def get(self) -> Response:
        return make_api_response(
            200, None, content=dict(_links=get_self_links(api, self), **np())
        )


@api.resource("/settings")
class SettingsController(rest.Resource):
    def get(self) -> Response:
        return make_api_response(
            200, None, content=dict(_links=get_self_links(api, self), **settings())
        )
