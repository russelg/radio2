import os
import queue
from functools import partial
from threading import Thread
from typing import Dict, List
from typing import Optional as _Optional
from urllib.parse import quote

import filetype
import flask_restful as rest
from flask import (Blueprint, Response, jsonify, make_response, request,
                   send_from_directory)
from flask_jwt_extended import (current_user, decode_token, jwt_optional,
                                jwt_required)
from jwt import ExpiredSignatureError
from webargs import ValidationError, fields, validate
from webargs.flaskparser import use_args, use_kwargs
from werkzeug.utils import secure_filename

import dataclasses
from radio.common.utils import (Pagination, RequestStatus, admin_required,
                                allowed_file, encode_file,
                                filter_default_webargs, insert_song,
                                make_api_response, request_status,
                                split_extension, user_is_admin)
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
def song_queries(page: int, query: _Optional[str], limit: int,
                 user: _Optional[User] = None) -> dict:
    if query and user:
        songs = user.favourites.select(
            lambda s: query in s.artist or query in s.title)
    elif query:
        songs = Song.select(lambda s: query in s.artist or query in s.title)
    elif user:
        songs = user.favourites.select()
    else:
        songs = Song.select()

    if not user:
        songs = songs.sort_by(desc(Song.added))

    total_songs = songs.count()
    pagination = Pagination(page=page, per_page=limit, total_count=total_songs)

    return {
        'limit': limit,
        'songs': songs,
        'total_songs': total_songs,
        'pagination': pagination
    }


def songs_links(context, page, query, limit, pagination):
    args = partial(filter_default_webargs, args=songs_args,
                   query=query, limit=limit)

    links = {'_self': api.url_for(context, **args(page=page), _external=True),
             '_next': api.url_for(context, **args(page=page + 1),
                                  _external=True) if pagination.has_next else None,
             '_prev': api.url_for(context, **args(page=page - 1),
                                  _external=True) if pagination.has_prev else None}

    return links


def songs_stub(context, page: int, query: _Optional[str], limit: int):
    pagination = Pagination(page=page, per_page=limit, total_count=0)

    return jsonify({
        '_links': songs_links(context, page, query, limit, pagination),
        'query': query,
        'pagination': pagination.to_json(),
        'songs': []
    })


def get_song_details(song: Song) -> Dict:
    SongData = dataclasses.make_dataclass('Song', [*filter(
        lambda k: k not in ['filename', 'favored_by'], Song.__annotations__),
        ('meta', RequestStatus, None),
        ('size', int, 0)])
    original_song = song
    song = SongData(**song.to_dict(exclude='filename', with_lazy=True))
    song.meta = request_status(song)
    song.meta.favourited = False
    song.size = os.path.getsize(os.path.join(
        app.config["PATH_MUSIC"], original_song.filename))
    if current_user:
        song.meta.favourited = song in current_user.favourites
    return song


def process_songs(context, page: int, query: _Optional[str], limit: int,
                  favourites: _Optional[User] = None) -> Response:
    info = song_queries(page, query, limit, favourites)
    songs = info['songs'].page(page, limit)

    processed_songs = list(map(get_song_details, songs))

    return jsonify({
        '_links': songs_links(context, page, query, limit, info['pagination']),
        'query': query,
        'pagination': info['pagination'].to_json(),
        'songs': processed_songs
    })


@db_session
def validate_page(args: Dict[str, any]) -> None:
    page = args['page']
    info = song_queries(page, args['query'], args['limit'])

    if page <= 0 or page > info['pagination'].pages:
        raise ValidationError('Page does not exist')


class SongsController(rest.Resource):
    @db_session
    @jwt_optional
    @use_kwargs(songs_args, validate=validate_page)
    def get(self, page: int, query: _Optional[str], limit: int) -> Response:
        return process_songs(self, page, query, limit)


request_args = {
    'id': fields.UUID(required=True)
}


@db_session
def validate_song(args: Dict[str, UUID]) -> None:
    song_id = args['id']

    if not Song.exists(id=song_id):
        raise ValidationError('Song does not exist')


class RequestController(rest.Resource):
    @db_session
    @jwt_optional
    @use_args(request_args, validate=validate_song)
    def put(self, args: Dict[str, UUID]) -> Response:
        song = Song[args['id']]
        status = request_status(song)

        if status.requestable:
            Queue(song=song, requested=True)
            meta = request_status(song)
            if current_user:
                meta.favourited = song in current_user.favourites
            return make_api_response(200, None, f'Requested "{song.title}" successfully', {'meta': meta})

        return make_api_response(400, 'Bad Request',
                                 f'"{song.title}" is not requestable at this moment ({status.reason})')


class AutocompleteController(rest.Resource):
    @db_session
    @use_kwargs({'query': fields.Str(required=True, validate=validate.Length(min=1))})
    def get(self, query: _Optional[str]) -> Response:
        data = []
        artists = select(s.artist for s in Song if query.lower()
                         in s.artist.lower()).limit(5)
        titles = select(s.title for s in Song if query.lower()
                        in s.title.lower()).limit(5)

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

        return make_api_response(200, None, content={
            'query': query,
            'suggestions': data
        })


class SongController(rest.Resource):
    @db_session
    @use_kwargs(request_args, validate=validate_song, locations=('view_args',))
    def get(self, id: UUID) -> Response:
        if not Song.exists(id=id):
            return make_api_response(404, 'Not Found', 'Song does not exist')

        song = Song[id]
        return make_api_response(200, None, content=dataclasses.asdict(get_song_details(song)))

    @db_session
    @admin_required
    @use_kwargs(request_args, validate=validate_song, locations=('view_args',))
    def put(self, id: UUID) -> Response:
        if not Song.exists(id=id):
            return make_api_response(404, 'Not Found', 'Song does not exist')

        if not request.json:
            return make_api_response(400, 'Bad Request', 'No data provided')

        values = {}
        accepted_fields = ['artist', 'title']
        for field, val in request.json.items():
            if field in accepted_fields:
                values[field] = val

        song = Song[id]
        song.set(**values)
        commit()

        return make_api_response(200, None, 'Successfully updated song metadata',
                                 content=dataclasses.asdict(get_song_details(song)))

    @db_session
    @admin_required
    @use_kwargs(request_args, validate=validate_song, locations=('view_args',))
    def delete(self, id: UUID) -> Response:
        if not Song.exists(id=id):
            return make_api_response(404, 'Not Found', 'Song does not exist')

        song = Song[id]
        song_path = os.path.join(app.config['PATH_MUSIC'], song.filename)
        if os.path.exists(song_path):
            os.remove(song_path)

        song.delete()

        app.logger.info(f'Deleted song "{song.filename}"')
        return make_api_response(200, None, f'Successfully deleted song "{song.filename}"')


@db_session
def validate_token(args: Dict[str, UUID]) -> None:
    token = args['token']
    error = 'Token is invalid'

    try:
        decoded = decode_token(token)
        if 'id' in decoded['identity']:
            return True
    except:
        raise ValidationError(error)

    raise ValidationError(error)


class DownloadController(rest.Resource):
    @db_session
    @jwt_optional
    @use_args({'token': fields.Str(required=True)},
              validate=lambda args: validate_token(args))
    def get(self, args: Dict[str, str]) -> Response:
        decoded = decode_token(args['token'])
        song_id = UUID(decoded['identity']['id'])
        # song_id = args['id']

        # if token_song_id != song_id:
        #     return make_api_response(409, 'Conflict', 'Token Song ID and provided Song ID are not the same')

        if not Song.exists(id=song_id):
            return make_api_response(404, 'Not Found', 'Song does not exist')

        song = Song[song_id]
        serve_filename = f'{song.artist} - {song.title}.ogg'

        response = make_response(send_from_directory(
            app.config['PATH_MUSIC'], song.filename))
        response.headers[
            "Content-Disposition"] = f"attachment;filename*=UTF-8''{quote(serve_filename)}"

        return response


class UploadController(rest.Resource):
    @db_session
    @jwt_optional
    def post(self) -> Response:
        if not app.config['PUBLIC_UPLOADS']:
            if not user_is_admin():
                return make_api_response(403, 'Forbidden', 'Uploading is not enabled')

        if 'song' not in request.files:
            app.logger.warning('No file part')
            return make_api_response(422, 'Unprocessable Entity', 'No `song` file field in request')

        song = request.files['song']
        if song.filename == '':
            app.logger.warning('No selected file')
            return make_api_response(422, 'Unprocessable Entity', 'No file selected')

        if allowed_file(song.filename):
            filename = secure_filename(song.filename)
            filepath = os.path.join(app.config['PATH_ENCODE'], filename)
            song.save(filepath)
            kind = filetype.guess(filepath)

            app.logger.debug(f'filetype: {kind}')
            if kind and kind.mime.split('/')[0] == 'audio':
                # use a queue to keep the thread return
                que = queue.Queue()
                child = Thread(target=lambda q, arg: q.put(
                    encode_file(arg)), args=(que, filename))
                child.daemon = True
                child.start()
                child.join()
                # reload_songs()

                if not que.empty():
                    final_path = que.get()

                    name, _ = os.path.splitext(os.path.basename(final_path))
                    name_ogg = f'{name}.ogg'

                    song = insert_song(name_ogg)
                    app.logger.info(f'File "{filename}" uploaded')
                    if song:
                        return make_api_response(200, None, f'File "{filename}" uploaded', {'id': song.id})
                        # return jsonify({'id': song.id})
                    else:
                        # delete upload as it failed due to no metadata
                        song_path = os.path.join(
                            app.config['PATH_MUSIC'], song.filename)
                        if os.path.exists(song_path):
                            os.remove(song_path)
                        return make_api_response(422, 'Unprocessable Entity', f'File was missing metadata, discarded')

        return make_api_response(422, 'Unprocessable Entity', f'File could not be processed')


favourite_args = {
    **songs_args,
    'user': fields.Str(required=True)
}


@db_session
def validate_user(args: Dict[str, str]) -> None:
    print(args)
    if not User.exists(username=args['user']):
        raise ValidationError('User does not exist')


class FavouriteController(rest.Resource):
    @db_session
    @jwt_optional
    @use_kwargs(favourite_args, validate=lambda args: validate_page(args) and validate_user(args))
    def get(self, page: int, query: _Optional[str], limit: int,
            user: _Optional[str]) -> Response:
        if user:
            user = User.get(username=user)
        elif current_user:
            user = current_user

        if user:
            return process_songs(self, page, query, limit, user)

        return songs_stub(self, page, query, limit)

    @db_session
    @jwt_required
    @use_args(request_args, validate=validate_song)
    def put(self, args: List[UUID]) -> Response:
        song = Song[args['id']]
        if song not in current_user.favourites:
            current_user.favourites.add(song)
            return make_api_response(200, None, f'Added "{song.title}" to your favourites')

        return make_api_response(400, 'Bad Request',
                                 f'"{song.title}" is already in your favourites')

    @db_session
    @jwt_required
    @use_args(request_args, validate=validate_song)
    def delete(self, args: List[UUID]) -> Response:
        song = Song[args['id']]
        if song in current_user.favourites:
            current_user.favourites.remove(song)
            return make_api_response(200, None,
                                     f'Removed "{song.title}" from your favourites')

        return make_api_response(400, 'Bad Request',
                                 f'"{song.title}" is not in your favourites')


api.add_resource(SongController, '/song/<id>')
api.add_resource(SongsController, '/songs')
api.add_resource(RequestController, '/request')
api.add_resource(FavouriteController, '/favourites')
api.add_resource(AutocompleteController, '/autocomplete')
api.add_resource(DownloadController, '/download')
api.add_resource(UploadController, '/upload')
