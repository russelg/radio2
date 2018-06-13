import os
from functools import partial
from typing import Optional as _Optional, List
from urllib.parse import quote

import flask_restful as rest
from flask import Blueprint, jsonify, send_from_directory, make_response, Response
from munch import Munch
from webargs import fields, validate, ValidationError
from webargs.flaskparser import use_kwargs, use_args

from radio.common.utils import request_status, Pagination, filter_default_webargs, make_error
from radio.models import *

blueprint = Blueprint('songs', __name__)
api = rest.Api(blueprint)

songs_args = {
    'page': fields.Int(missing=1),
    'query': fields.Str(missing=None, validate=validate.Length(min=1)),
    'limit': fields.Int(missing=app.config.get('SONGS_PER_PAGE', 50),
                        validate=lambda a: 0 < a <= app.config.get('SONGS_PER_PAGE', 50))
}


@db_session
def song_queries(page: int, query: _Optional[str], limit: int) -> dict:
    if query is not None:
        songs = select(s for s in Song if query in s.artist or query in s.title).sort_by(desc(Song.added))
    else:
        songs = select(s for s in Song).sort_by(desc(Song.added))

    total_songs = songs.count()
    pagi = Pagination(page=page, per_page=limit, total_count=total_songs)

    return Munch({
        'limit': limit,
        'songs': songs,
        'total_songs': total_songs,
        'pagi': pagi
    })


@db_session
def validate_page(page: int, query: _Optional[str], limit: int) -> None:
    info = song_queries(page, query, limit)

    if page <= 0 or page > info.pagi.pages:
        raise ValidationError('Page does not exist')


class SongsController(rest.Resource):
    @db_session
    @use_kwargs(songs_args, validate=lambda args: validate_page(**args))
    def get(self, page: int, query: _Optional[str], limit: int) -> Response:
        info = song_queries(page, query, limit)

        songs = info.songs.page(page, limit)
        processed_songs = []

        for song in songs:
            processed = Munch(song.to_dict(exclude='filename', with_lazy=True))
            processed.meta = request_status(song)
            processed.size = os.path.getsize(os.path.join(app.config["PATH_MUSIC"], song.filename))
            processed_songs.append(processed)

        args = partial(filter_default_webargs, args=songs_args, query=query, limit=limit)

        links = {'_self': api.url_for(self, **args(page=page), _external=True),
                 '_next': api.url_for(self, **args(page=page + 1), _external=True) if info.pagi.has_next else None,
                 '_prev': api.url_for(self, **args(page=page - 1), _external=True) if info.pagi.has_prev else None}

        return jsonify({
            '_links': links,
            'query': query,
            'pagination': info.pagi.to_json(),
            'songs': processed_songs
        })


request_args = {
    'id': fields.UUID(required=True)
}


@db_session
def validate_song(args: List[UUID]) -> None:
    song_id = args['id']

    if not Song.exists(id=song_id):
        raise ValidationError('Song does not exist')


class RequestController(rest.Resource):
    @db_session
    @use_args(request_args, locations=('json',), validate=validate_song)
    def put(self, args: List[UUID]) -> Response:
        song = Song[args['id']]
        status = request_status(song)

        if status.requestable:
            Queue(song=song, requested=True)
            return {
                'message': f'Requested "{song.title}" successfully',
                'meta': request_status(song)
            }

        return make_error(400, 'Bad Request', f'"{song.title}" is not requestable at this moment ({status.reason})')


class AutocompleteController(rest.Resource):
    @db_session
    @use_kwargs({'query': fields.Str(required=True, validate=validate.Length(min=1))})
    def get(self, query: _Optional[str]) -> Response:
        data = []
        artists = select(s.artist for s in Song if query.lower() in s.artist.lower()).limit(5)
        titles = select(s.title for s in Song if query.lower() in s.title.lower()).limit(5)

        for artist in artists:
            data.append({
                'result': artist,
                'type': 'Artist'
            })

        for title in titles:
            data.append({
                'result': title,
                'type': 'Title'
            })

        return {
            'query': query,
            'suggestions': data
        }


class DownloadController(rest.Resource):
    @db_session
    @use_kwargs(request_args, validate=validate_song, locations=('view_args',))
    def get(self, id: UUID) -> Response:
        if not app.config['PUBLIC_DOWNLOADS']:
            return make_error(403, 'Forbidden', f'Downloading is not enabled')

        if not Song.exists(id=id):
            return make_error(404, 'Not Found', f'Song was not found')

        song = Song[id]
        serve_filename = f'{song.artist} - {song.title}.ogg'

        response = make_response(send_from_directory(app.config['PATH_MUSIC'], song.filename))
        response.headers["Content-Disposition"] = \
            "attachment;" \
            f"filename*=UTF-8''{quote(serve_filename)}"

        return response


api.add_resource(SongsController, '/songs')
api.add_resource(RequestController, '/request')
api.add_resource(AutocompleteController, '/autocomplete')
api.add_resource(DownloadController, '/download/<id>')
