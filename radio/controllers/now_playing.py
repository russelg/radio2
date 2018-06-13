import collections
from urllib.parse import unquote

import arrow
import flask_restful as rest
from flask import Blueprint, request, jsonify, Response
from munch import DefaultMunch, Munch

from radio.common.utils import get_folder_metadata, parse_status
from radio.models import *

blueprint = Blueprint('np', __name__)
api = rest.Api(blueprint)


@db_session
def np() -> dict:
    folder_stats = get_folder_metadata(path=app.config['PATH_MUSIC'])

    url = 'http://{host}:{port}{mount}.xspf'.format(host=app.config['ICECAST_HOST'],
                                                    port=app.config['ICECAST_PORT'], mount=app.config['ICECAST_MOUNT'])
    listeners_count = int(parse_status(url).get('Current Listeners', 0))

    lastplayed_rows = Song.select(lambda c: c.lastplayed is not None).sort_by(desc(Song.lastplayed)).prefetch(
        Song.artist, Song.title, Song.length).limit(6)

    times = Munch({})
    if lastplayed_rows:
        top_row = lastplayed_rows[0]
        times.now = arrow.now()
        times.start = arrow.get(top_row.lastplayed)
        times.current = times.now - times.start
        times.length = top_row.length
        times.end = times.start.shift(seconds=times.length)
        current_id = top_row.id
    else:
        top_row = DefaultMunch('', {'length': 0})
        times.now = arrow.now()
        times.start = arrow.now()
        times.current = times.now - times.start
        times.length = 0
        times.end = times.start.shift(seconds=times.length)
        current_id = None

    queue = []
    time_str = times.end

    for entry in Queue.select().prefetch(Queue.song).limit(10):
        queue.append({
            'artist': entry.song.artist,
            'title': entry.song.title,
            'time': time_str.isoformat(),
            'timestamp': time_str.timestamp,
            'requested': entry.requested,
            'id': entry.song.id
        })
        time_str = time_str.shift(seconds=entry.song.length)

    lastplayed = []
    time_str = times.end.shift(seconds=-top_row.length)
    for song in lastplayed_rows[1:]:
        lastplayed.append({
            'artist': song.artist,
            'title': song.title,
            'time': time_str.isoformat(),
            'timestamp': time_str.timestamp,
            'requested': False,
            'index': song.id
        })
        time_str = time_str.shift(seconds=-song.length)

    total_playcount = sum(song.playcount for song in Song)

    return {
        'len': times.length,
        'current': times.now.timestamp,
        'start_time': times.start.timestamp,
        'end_time': times.end.timestamp,
        'artist': top_row.artist,
        'title': top_row.title,
        'id': current_id,
        'requested': False,
        'total_songs': folder_stats.files,
        'total_plays': total_playcount,
        'queue': queue,
        'lp': lastplayed,
        'total_size': folder_stats.size,
        'listeners': listeners_count
    }


def settings() -> dict:
    return {
        'css': unquote(request.cookies.get('stylesheet') or app.config['CSS'][app.config['DEFAULT_CSS']]),
        'styles': collections.OrderedDict(sorted(app.config['CSS'].items())),
        'icecast': {
            'mount': app.config['ICECAST_MOUNT'],
            'url': app.config['ICECAST_URL']
        },
        'title': app.config['TITLE'],
        'downloads_enabled': app.config['PUBLIC_DOWNLOADS']
    }


class NowPlayingController(rest.Resource):
    def get(self) -> Response:
        links = {
            '_self': api.url_for(self, _external=True)
        }
        return jsonify(dict(np(), _links=links))


class SettingsController(rest.Resource):
    def get(self) -> Response:
        links = {
            '_self': api.url_for(self, _external=True)
        }
        return jsonify(dict(settings(), _links=links))


api.add_resource(NowPlayingController, '/np', '/nowplaying')
api.add_resource(SettingsController, '/settings')
