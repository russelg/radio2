import concurrent.futures
import dataclasses
import os
from functools import partial
from typing import Dict, Optional
from urllib.parse import quote
from uuid import UUID

import filetype
import flask_restful as rest
from flask import Blueprint, Response, make_response, request, send_from_directory
from flask_jwt_extended import current_user, decode_token, jwt_optional, jwt_required
from marshmallow import ValidationError, fields, validate
from pony.orm import commit, db_session, desc, select
from pony.orm.core import Query
from werkzeug.utils import secure_filename

from radio import app, redis_client
from radio.common.pagination import Pagination
from radio.common.schemas import (
    DownloadSchema,
    FavouriteSchema,
    SongBasicSchema,
    SongData,
    SongMeta,
    SongQuerySchema,
)
from radio.common.users import admin_required, user_is_admin
from radio.common.utils import (
    allowed_file,
    encode_file,
    filter_default_webargs,
    get_song_or_abort,
    insert_song,
    make_api_response,
    parser,
    request_status,
    add_resource,
    get_metadata,
)
from radio.models import Queue, Song, User

blueprint = Blueprint("songs", __name__)
api = rest.Api(blueprint)


# TODO: break this file up


@db_session
def query_songs(query: Optional[str], user: Optional[User] = None) -> Query:
    songs: Query
    src = user.favourites if user else Song
    if query:
        query = query.lower()
        songs = select(
            s for s in src if query in s.artist.lower() or query in s.title.lower()
        )
    else:
        songs = src.select()
    # sort by date uploaded if not a favourite
    if not user:
        songs = songs.sort_by(desc(Song.added))
    return songs


def get_song_detailed(song: Song) -> SongData:
    """
    Gets file size and request status for the given song

    :param song: Song to get details for
    :return: SongData
    """
    original_song = song
    song = SongData(**song.to_dict(exclude="filename", with_lazy=True))
    song.size = os.path.getsize(
        os.path.join(app.config["PATH_MUSIC"], original_song.filename)
    )
    song.meta = SongMeta(**dataclasses.asdict(request_status(song)))
    if current_user:
        song.meta.favourited = original_song in current_user.favourites
    return song


@db_session
def get_songs_response(
    context,
    page: int,
    query: Optional[str],
    limit: int,
    favourites: Optional[User] = None,
) -> Response:
    results = query_songs(query, favourites)
    pagination = Pagination(page=page, per_page=limit, total_count=results.count())
    # report error if page does not exist
    if page <= 0 or page > pagination.pages:
        return make_api_response(422, "Unprocessable Entity", ["Page does not exist"])
    processed_songs = list(map(get_song_detailed, results.page(page, limit)))
    args = partial(
        filter_default_webargs, args=SongQuerySchema(), query=query, limit=limit
    )
    return make_api_response(
        200,
        None,
        content={
            "_links": {
                "_self": api.url_for(context, **args(page=page), _external=True),
                "_next": api.url_for(context, **args(page=page + 1), _external=True)
                if pagination.has_next
                else None,
                "_prev": api.url_for(context, **args(page=page - 1), _external=True)
                if pagination.has_prev
                else None,
            },
            "query": query,
            "pagination": pagination.to_json(),
            "songs": processed_songs,
        },
    )


@add_resource(api, "/songs")
class SongsController(rest.Resource):
    @jwt_optional
    def get(self) -> Response:
        args = parser.parse(SongQuerySchema(), request)
        return get_songs_response(self, args["page"], args["query"], args["limit"])


@add_resource(api, "/request")
class RequestController(rest.Resource):
    @jwt_optional
    @parser.use_args(SongBasicSchema())
    def put(self, args: Dict[str, UUID]) -> Response:
        song = Song[args.get("id")]
        status = request_status(song)
        if status.requestable:
            Queue(song=song, requested=True)
            meta = SongMeta(
                **dataclasses.asdict(request_status(song)),
                favourited=False
                if not current_user
                else song in current_user.favourites,
            )

            return make_api_response(
                200, None, f'Requested "{song.title}" successfully', {"meta": meta}
            )

        return make_api_response(
            400,
            "Bad Request",
            f'"{song.title}" is not requestable at this moment. {status.reason}',
        )


@add_resource(api, "/autocomplete")
class AutocompleteController(rest.Resource):
    @parser.use_kwargs(
        {"query": fields.Str(required=True, validate=validate.Length(min=2))}
    )
    def get(self, query: str) -> Response:
        data = []
        artists = select(s.artist for s in Song if query.lower() in s.artist.lower())
        titles = select(s.title for s in Song if query.lower() in s.title.lower())

        for entry in artists.limit(5):
            data.append({"result": entry, "type": "Artist"})
        for entry in titles.limit(5):
            data.append({"result": entry, "type": "Title"})

        return make_api_response(
            200, None, content={"query": query, "suggestions": data}
        )


@add_resource(api, "/song/<id>")
class SongController(rest.Resource):
    @jwt_optional
    @parser.use_args(SongBasicSchema(), locations=("view_args",))
    def get(self, args: Dict[str, UUID], id: any) -> Response:
        song = get_song_or_abort(args["id"])
        return make_api_response(
            200, None, content=dataclasses.asdict(get_song_detailed(song))
        )

    @admin_required
    @parser.use_args(SongBasicSchema(), locations=("view_args",))
    def put(self, args: Dict[str, UUID], id: any) -> Response:
        if not request.json:
            return make_api_response(400, "Bad Request", "No data provided")

        accepted_fields = ["artist", "title"]
        values = {
            field: val
            for field, val in request.json.items()
            if field in accepted_fields
        }

        song = get_song_or_abort(args["id"])
        song.set(**values)
        commit()

        return make_api_response(
            200,
            None,
            "Successfully updated song metadata",
            content=dataclasses.asdict(get_song_detailed(song)),
        )

    @admin_required
    @parser.use_args(SongBasicSchema(), locations=("view_args",))
    def delete(self, args: Dict[str, UUID], id: any) -> Response:
        song = get_song_or_abort(args["id"])
        filepath = os.path.join(app.config["PATH_MUSIC"], song.filename)
        if os.path.isfile(filepath):
            os.remove(filepath)
        song.delete()
        app.logger.info(f'Deleted song "{song.filename}"')
        return make_api_response(
            200, None, f'Successfully deleted song "{song.filename}"'
        )


@db_session
def validate_download_token(args: Dict[str, UUID]) -> bool:
    try:
        decoded = decode_token(args["token"])
        if "id" in decoded["identity"]:
            return True
    except:
        pass
    raise ValidationError("Token is invalid")


@add_resource(api, "/download")
class DownloadController(rest.Resource):
    @jwt_optional
    @parser.use_args(DownloadSchema(), validate=validate_download_token)
    def get(self, args: Dict[str, str]) -> Response:
        decoded = decode_token(args["token"])
        song_id = UUID(decoded["identity"]["id"])
        song = get_song_or_abort(song_id)

        serve_filename = quote(f"{song.artist} - {song.title}.ogg")
        response = make_response(
            send_from_directory(app.config["PATH_MUSIC"], song.filename)
        )
        response.headers[
            "Content-Disposition"
        ] = f"attachment;filename*=UTF-8''{serve_filename}"
        return response


@add_resource(api, "/upload")
class UploadController(rest.Resource):
    @jwt_optional
    def post(self) -> Response:
        if not app.config["PUBLIC_UPLOADS"]:
            if not user_is_admin():
                return make_api_response(403, "Forbidden", "Uploading is not enabled")

        if "song" not in request.files:
            app.logger.warning("No file part")
            return make_api_response(
                422, "Unprocessable Entity", "No `song` file field in request"
            )

        song = request.files["song"]
        if song.filename == "":
            app.logger.warning("No selected file")
            return make_api_response(422, "Unprocessable Entity", "No file selected")

        if allowed_file(song.filename):
            filename = secure_filename(song.filename)
            filepath = os.path.join(app.config["PATH_ENCODE"], filename)
            song.save(filepath)
            kind = filetype.guess(filepath)
            if kind and kind.mime.split("/")[0] == "audio":
                meta = get_metadata(filepath)
                if not meta:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    return make_api_response(
                        422, "Unprocessable Entity", "File missing metadata, discarded",
                    )
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(encode_file, filename)
                    final_path = future.result()
                    name, _ = os.path.splitext(os.path.basename(final_path))
                    ogg_path = f"{name}.ogg"
                    song = insert_song(ogg_path)
                    app.logger.info(f'File "{filename}" uploaded')
                    if song:
                        return make_api_response(
                            200, None, f'File "{filename}" uploaded', {"id": song.id}
                        )
            else:
                if os.path.exists(filepath):
                    os.remove(filepath)
                return make_api_response(
                    422, "Unprocessable Entity", "File is not audio, discarded",
                )
        return make_api_response(
            422, "Unprocessable Entity", "File could not be processed"
        )


@add_resource(api, "/favourites")
class FavouriteController(rest.Resource):
    @jwt_optional
    @parser.use_kwargs(FavouriteSchema())
    def get(self, page: int, query: str, limit: int, user: Optional[str]) -> Response:
        user: User
        if user:
            user = User.get(username=user)
        elif current_user:
            user = current_user
        return get_songs_response(self, page, query, limit, user)

    @jwt_required
    @parser.use_args(SongBasicSchema())
    def put(self, args: Dict[str, UUID]) -> Response:
        song: Song = Song[args["id"]]
        if song not in current_user.favourites:
            current_user.favourites.add(song)
            return make_api_response(
                200, None, f'Added "{song.title}" to your favourites'
            )
        return make_api_response(
            400, "Bad Request", f'"{song.title}" is already in your favourites'
        )

    @jwt_required
    @parser.use_args(SongBasicSchema())
    def delete(self, args: Dict[str, UUID]) -> Response:
        song: Song = Song[args["id"]]
        if song in current_user.favourites:
            current_user.favourites.remove(song)
            return make_api_response(
                200, None, f'Removed "{song.title}" from your favourites'
            )
        return make_api_response(
            400, "Bad Request", f'"{song.title}" is not in your favourites'
        )


@add_resource(api, "/skip")
class SkipController(rest.Resource):
    @admin_required
    def post(self) -> Response:
        redis_client.publish("skip", "True")
        return make_api_response(200, None, "Successfully skipped current playing song")
