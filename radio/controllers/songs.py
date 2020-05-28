import dataclasses
import os
import queue
from functools import partial
from threading import Thread
from typing import Any, Dict, Optional
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
from radio.common.users import admin_required, user_exists, user_is_admin
from radio.common.utils import (
    allowed_file,
    encode_file,
    filter_default_webargs,
    get_song_or_abort,
    insert_song,
    make_api_response,
    parser,
    request_status,
)

# from radio import models as db
from radio.models import Queue, Song, User

blueprint = Blueprint("songs", __name__)
api = rest.Api(blueprint)


# TODO: break this file up
# TODO: clean up search code (surely this problem has been solved already?)


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

    # sort by date favourited for favourites
    if not user:
        songs = songs.sort_by(desc(Song.added))

    return songs


def songs_links(context, page, query, limit, pagination):
    # remove args when they are at their default value to simplify URLs
    args = partial(
        filter_default_webargs, args=SongQuerySchema(), query=query, limit=limit
    )

    return {
        "_self": api.url_for(context, **args(page=page), _external=True),
        "_next": api.url_for(context, **args(page=page + 1), _external=True)
        if pagination.has_next
        else None,
        "_prev": api.url_for(context, **args(page=page - 1), _external=True)
        if pagination.has_prev
        else None,
    }


def get_song_details(song: Song) -> SongData:
    original_song = song
    song = SongData(**song.to_dict(exclude="filename", with_lazy=True))
    song.size = os.path.getsize(
        os.path.join(app.config["PATH_MUSIC"], original_song.filename)
    )
    song.meta = SongMeta(**dataclasses.asdict(request_status(song)), favourited=False)
    if current_user:
        song.meta.favourited = original_song in current_user.favourites
    return song


def process_songs(
    context,
    page: int,
    query: Optional[str],
    limit: int,
    favourites: Optional[User] = None,
) -> Response:
    results = query_songs(query, favourites)
    pagination = Pagination(page=page, per_page=limit, total_count=results.count())
    processed_songs = list(map(get_song_details, results.page(page, limit)))
    return make_api_response(
        200,
        None,
        content={
            "_links": songs_links(context, page, query, limit, pagination),
            "query": query,
            "pagination": pagination.to_json(),
            "songs": processed_songs,
        },
    )


# TODO: verify page in controllers instead
# (duplicate queries)
@db_session
def validate_page(args: Dict[str, Any]) -> None:
    page = args["page"]
    results = query_songs(args["query"])
    pagination = Pagination(
        page=page, per_page=args["limit"], total_count=results.count()
    )
    if page <= 0 or page > pagination.pages:
        raise ValidationError("Page does not exist")


class SongsController(rest.Resource):
    @jwt_optional
    def get(self) -> Response:
        args = parser.parse(SongQuerySchema(), request, validate=validate_page)
        return process_songs(self, args["page"], args["query"], args["limit"])


@db_session
def validate_song(args: Dict[str, UUID]) -> None:
    song_id = args.get("id", None)
    if not song_id or not Song.exists(id=song_id):
        raise ValidationError("Song does not exist")


class RequestController(rest.Resource):
    @jwt_optional
    @parser.use_args(SongBasicSchema(), validate=validate_song)
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


class SongController(rest.Resource):
    @jwt_optional
    @parser.use_kwargs(
        SongBasicSchema(), validate=validate_song, locations=("view_args",)
    )
    def get(self, id: UUID) -> Response:
        song = get_song_or_abort(id)
        return make_api_response(
            200, None, content=dataclasses.asdict(get_song_details(song))
        )

    @admin_required
    @parser.use_kwargs(
        SongBasicSchema(), validate=validate_song, locations=("view_args",)
    )
    def put(self, id: UUID) -> Response:
        if not request.json:
            return make_api_response(400, "Bad Request", "No data provided")

        values = {}
        accepted_fields = ["artist", "title"]
        for field, val in request.json.items():
            if field in accepted_fields:
                values[field] = val

        song = get_song_or_abort(id)
        song.set(**values)
        commit()

        return make_api_response(
            200,
            None,
            "Successfully updated song metadata",
            content=dataclasses.asdict(get_song_details(song)),
        )

    @admin_required
    @parser.use_kwargs(
        SongBasicSchema(), validate=validate_song, locations=("view_args",)
    )
    def delete(self, id: UUID) -> Response:
        song = get_song_or_abort(id)
        song_path = os.path.join(app.config["PATH_MUSIC"], song.filename)
        if os.path.exists(song_path):
            os.remove(song_path)
        song.delete()
        app.logger.info(f'Deleted song "{song.filename}"')
        return make_api_response(
            200, None, f'Successfully deleted song "{song.filename}"'
        )


@db_session
def validate_token(args: Dict[str, UUID]) -> bool:
    error = "Token is invalid"
    try:
        decoded = decode_token(args["token"])
        if "id" in decoded["identity"]:
            return True
    except:
        raise ValidationError(error)
    raise ValidationError(error)


class DownloadController(rest.Resource):
    @jwt_optional
    @parser.use_args(DownloadSchema(), validate=validate_token)
    def get(self, args: Dict[str, str]) -> Response:
        decoded = decode_token(args["token"])
        song_id = UUID(decoded["identity"]["id"])
        song = get_song_or_abort(song_id)

        serve_filename = f"{song.artist} - {song.title}.ogg"
        response = make_response(
            send_from_directory(app.config["PATH_MUSIC"], song.filename)
        )
        response.headers[
            "Content-Disposition"
        ] = f"attachment;filename*=UTF-8''{quote(serve_filename)}"
        return response


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

            app.logger.debug(f"filetype: {kind}")
            if kind and kind.mime.split("/")[0] == "audio":
                # use a queue to keep the thread return
                que = queue.Queue()
                child = Thread(
                    target=lambda q, arg: q.put(encode_file(arg)), args=(que, filename)
                )
                child.daemon = True
                child.start()
                child.join()

                if not que.empty():
                    final_path = que.get()
                    name, _ = os.path.splitext(os.path.basename(final_path))
                    name_ogg = f"{name}.ogg"

                    song = insert_song(name_ogg)
                    app.logger.info(f'File "{filename}" uploaded')
                    if song:
                        return make_api_response(
                            200, None, f'File "{filename}" uploaded', {"id": song.id}
                        )
                    else:
                        # delete upload as it failed due to no metadata
                        song_path = os.path.join(
                            app.config["PATH_MUSIC"], song.filename
                        )
                        if os.path.exists(song_path):
                            os.remove(song_path)

                        return make_api_response(
                            422,
                            "Unprocessable Entity",
                            "File was missing metadata, discarded",
                        )

        return make_api_response(
            422, "Unprocessable Entity", "File could not be processed"
        )


@db_session
def validate_user(args: Dict[str, str]) -> None:
    if not user_exists(username=args["user"]):
        raise ValidationError("User does not exist")


class FavouriteController(rest.Resource):
    @jwt_optional
    @parser.use_kwargs(
        FavouriteSchema(),
        validate=lambda args: validate_page(args) and validate_user(args),
    )
    def get(self, page: int, query: str, limit: int, user: Optional[str]) -> Response:
        user: User
        if user:
            user = User.get(username=user)
        elif current_user:
            user = current_user

        if user:
            return process_songs(self, page, query, limit, user)

        pagination = Pagination(page=page, per_page=limit, total_count=0)
        return make_api_response(
            200,
            None,
            content={
                "_links": songs_links(self, page, query, limit, pagination),
                "query": query,
                "pagination": pagination.to_json(),
                "songs": [],
            },
        )

    @jwt_required
    @parser.use_args(SongBasicSchema(), validate=validate_song)
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
    @parser.use_args(SongBasicSchema(), validate=validate_song)
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


class SkipController(rest.Resource):
    @admin_required
    def post(self) -> Response:
        redis_client.publish("skip", "True")
        return make_api_response(200, None, "Successfully skipped current playing song")


api.add_resource(SongController, "/song/<id>")
api.add_resource(SongsController, "/songs")
api.add_resource(RequestController, "/request")
api.add_resource(FavouriteController, "/favourites")
api.add_resource(AutocompleteController, "/autocomplete")
api.add_resource(DownloadController, "/download")
api.add_resource(UploadController, "/upload")
api.add_resource(SkipController, "/skip")
