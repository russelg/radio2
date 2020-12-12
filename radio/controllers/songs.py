import concurrent.futures
import dataclasses
import os
from datetime import timedelta
from functools import partial
from pathlib import Path
from typing import Dict
from typing import Optional
from urllib.parse import quote
from uuid import UUID

import filetype
import flask_restful as rest
import mutagen
from flask import Blueprint
from flask import Response
from flask import make_response
from flask import request
from flask import send_from_directory
from flask_jwt_extended import create_access_token
from flask_jwt_extended import current_user
from flask_jwt_extended import decode_token
from flask_jwt_extended import jwt_optional
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from marshmallow import fields
from marshmallow import validate
from pony.orm import commit
from pony.orm import db_session
from pony.orm import desc
from pony.orm import select
from pony.orm.core import Query
from werkzeug.utils import secure_filename

from radio import app
from radio import redis_client
from radio.common.pagination import Pagination
from radio.common.schemas import FavouriteSchema
from radio.common.schemas import SongBasicSchema
from radio.common.schemas import SongData
from radio.common.schemas import SongMeta
from radio.common.schemas import SongQuerySchema
from radio.common.schemas import TokenSchema
from radio.common.users import admin_required
from radio.common.users import user_is_admin
from radio.common.utils import EncodeError
from radio.common.utils import allowed_file_extension
from radio.common.utils import encode_file
from radio.common.utils import filter_default_webargs
from radio.common.utils import get_metadata
from radio.common.utils import get_song_or_abort
from radio.common.utils import insert_song
from radio.common.utils import make_api_response
from radio.common.utils import parser
from radio.common.utils import request_status
from radio.database import Queue
from radio.database import Song
from radio.database import User

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
    song.size = Path(app.config["PATH_MUSIC"], original_song.filename).stat().st_size
    song.meta = SongMeta(**dataclasses.asdict(request_status(song)))
    if current_user:
        song.meta.favourited = original_song in current_user.favourites
    return song


@db_session
def get_songs_response(
    context: rest.Resource,
    page: int,
    query: Optional[str],
    limit: int,
    favourites: Optional[User] = None,
) -> Response:
    results = query_songs(query, favourites)
    pagination = Pagination(page=page, per_page=limit, total_count=results.count())
    # report error if page does not exist
    if page <= 0 or page > pagination.pages:
        return make_api_response(404, "Page does not exist")
    processed_songs = list(map(get_song_detailed, results.page(page, limit)))
    args = partial(
        filter_default_webargs, args=SongQuerySchema(), query=query, limit=limit
    )
    return make_api_response(200, content={
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
    })


@api.resource("/songs")
class SongsController(rest.Resource):
    @jwt_optional
    def get(self) -> Response:
        args = parser.parse(SongQuerySchema(), request)
        return get_songs_response(self, args["page"], args["query"], args["limit"])


@api.resource("/request")
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
            return make_api_response(200, f'Requested "{song.title}" successfully', {"meta": meta})
        return make_api_response(400, f'"{song.title}" is not requestable at this moment. {status.reason}')


@api.resource("/autocomplete")
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
        return make_api_response(200, content={"query": query, "suggestions": data})


@api.resource("/song/<id>")
class SongController(rest.Resource):
    @jwt_optional
    @parser.use_args(SongBasicSchema(), locations=("view_args",))
    def get(self, args: Dict[str, UUID], id: any) -> Response:
        song = get_song_or_abort(args["id"])
        return make_api_response(200, content=dataclasses.asdict(get_song_detailed(song)))

    @admin_required
    @parser.use_args(SongBasicSchema(), locations=("view_args",))
    def put(self, args: Dict[str, UUID], id: any) -> Response:
        if not request.json:
            return make_api_response(400, "No data provided")
        accepted_fields = ["artist", "title"]
        values = {
            field: val
            for field, val in request.json.items()
            if field in accepted_fields
        }
        song = get_song_or_abort(args["id"])
        song.set(**values)
        commit()
        # update file metadata as well
        metadata = mutagen.File(
            Path(app.config["PATH_MUSIC"], song.filename), easy=True
        )
        metadata.update(values)
        metadata.save()
        return make_api_response(200, "Successfully updated song metadata",
                                 content=dataclasses.asdict(get_song_detailed(song)))

    @admin_required
    @parser.use_args(SongBasicSchema(), locations=("view_args",))
    def delete(self, args: Dict[str, UUID], id: any) -> Response:
        song = get_song_or_abort(args["id"])
        filepath = os.path.join(app.config["PATH_MUSIC"], song.filename)
        if os.path.isfile(filepath):
            os.remove(filepath)
        song.delete()
        app.logger.info(f'Deleted song "{song.filename}"')
        return make_api_response(200, f'Successfully deleted song "{song.filename}"')


@db_session
def validate_download_token(args: Dict[str, UUID]) -> bool:
    try:
        decoded = decode_token(args["token"])
        if "id" in decoded["identity"]:
            return True
    except:
        pass
    raise ValidationError("Token is invalid")


@api.resource("/download")
class DownloadController(rest.Resource):
    @jwt_optional
    @parser.use_args(TokenSchema(), validate=validate_download_token)
    def get(self, args: Dict[str, str]) -> Response:
        decoded = decode_token(args["token"])
        song_id = UUID(decoded["identity"]["id"])
        song = get_song_or_abort(song_id)
        serve_filename = quote(f"{song.artist} - {song.title}.ogg")
        response: Response = make_response(
            send_from_directory(app.config["PATH_MUSIC"], song.filename)
        )
        response.headers.set(
            "Content-Disposition", f"attachment;filename*=UTF-8''{serve_filename}"
        )
        return response

    @jwt_optional
    @parser.use_args(SongBasicSchema(), locations=("json",))
    def post(self, args: Dict[str, UUID]) -> Response:
        if not app.config["PUBLIC_DOWNLOADS"]:
            if not current_user or not current_user.admin:
                return make_api_response(403, "Downloading is not enabled")
        song_id = args["id"]
        new_token = create_access_token(
            {"id": str(song_id)}, expires_delta=timedelta(seconds=10)
        )
        return make_api_response(200, content={"download_token": new_token, "id": song_id})


@api.resource("/upload")
class UploadController(rest.Resource):
    @jwt_optional
    def post(self) -> Response:
        if not app.config["PUBLIC_UPLOADS"]:
            if not user_is_admin():
                return make_api_response(403, "Uploading is not enabled")

        if "song" not in request.files:
            app.logger.warning("No file part")
            return make_api_response(400, "No `song` file field in request")

        song = request.files["song"]
        if song.filename == "":
            app.logger.warning("No selected file")
            return make_api_response(400, "No file selected")

        if allowed_file_extension(Path(song.filename)):
            filename = secure_filename(song.filename)
            if not filename:
                return make_api_response(400, "Filename not valid")

            filepath = Path(app.config["PATH_ENCODE"], filename)
            song.save(str(filepath))

            kind = filetype.guess(str(filepath))
            if not kind or kind.mime.split("/")[0] != "audio":
                filepath.unlink(missing_ok=True)
                return make_api_response(400, "File is not audio")

            meta = get_metadata(filepath)
            if not meta:
                filepath.unlink(missing_ok=True)
                return make_api_response(400, "File missing metadata")

            with concurrent.futures.ThreadPoolExecutor() as executor:
                try:
                    future = executor.submit(
                        encode_file, filepath, remove_original=True
                    )
                    final_path = future.result()
                    song = insert_song(final_path)
                    if song:
                        app.logger.info(f'File "{filename}" uploaded')
                        return make_api_response(200, f'File "{filename}" uploaded', content={"id": song.id})
                except EncodeError:
                    # delete the original
                    app.logger.exception(f"Encode error for {filepath}")
                    filepath.unlink(missing_ok=True)
                    return make_api_response(400, "File could not be encoded")
        return make_api_response(400, "File could not be processed")


@api.resource("/favourites")
class FavouriteController(rest.Resource):
    @jwt_optional
    @parser.use_kwargs(FavouriteSchema())
    def get(self, page: int, query: str, limit: int, user: Optional[str]) -> Response:
        if user:
            user = User.get(username=user)
        elif current_user:
            user = current_user
        return get_songs_response(self, page, query, limit, user)

    @jwt_required
    @parser.use_args(SongBasicSchema())
    def put(self, args: Dict[str, UUID]) -> Response:
        song = Song[args["id"]]
        if song not in current_user.favourites:
            current_user.favourites.add(song)
            return make_api_response(200, f'Added "{song.title}" to your favourites')
        return make_api_response(400, f'"{song.title}" is already in your favourites')

    @jwt_required
    @parser.use_args(SongBasicSchema())
    def delete(self, args: Dict[str, UUID]) -> Response:
        song = Song[args["id"]]
        if song in current_user.favourites:
            current_user.favourites.remove(song)
            return make_api_response(200, f'Removed "{song.title}" from your favourites')
        return make_api_response(400, f'"{song.title}" is not in your favourites')


@api.resource("/skip")
class SkipController(rest.Resource):
    @admin_required
    def post(self) -> Response:
        redis_client.publish("skip", "True")
        return make_api_response(200, "Successfully skipped current playing song")
