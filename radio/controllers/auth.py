from datetime import timedelta
from typing import Dict
from uuid import UUID

import flask_restful as rest
from flask import Blueprint, Response
from flask_jwt_extended import (
    create_access_token,
    current_user,
    jwt_optional,
    jwt_refresh_token_required,
    jwt_required,
)

from radio import app
from radio.common.schemas import SongBasicSchema, UserSchema
from radio.common.users import (
    refresh_token,
    register,
    sign_in,
    valid_username,
)
from radio.common.utils import (
    get_song_or_abort,
    make_api_response,
    parser,
)
from radio.models import User

blueprint = Blueprint("auth", __name__)
api = rest.Api(blueprint)


@api.resource("/login")
class LoginController(rest.Resource):
    @parser.use_kwargs(UserSchema())
    def post(self, username: str, password: str) -> Response:
        tokens = sign_in(username, password)
        if tokens:
            return make_api_response(200, None, content=tokens)
        return make_api_response(401, "Unauthorized", "Invalid credentials")


@api.resource("/refresh")
class RefreshController(rest.Resource):
    @jwt_refresh_token_required
    def post(self) -> Response:
        tokens = refresh_token(current_user)
        if tokens:
            return make_api_response(200, None, content=tokens)
        return make_api_response(500, "Server Error", "Issue loading user")


@api.resource("/download")
class DownloadController(rest.Resource):
    @jwt_optional
    @parser.use_args(SongBasicSchema(), locations=("json",))
    def post(self, args: Dict[str, UUID]) -> Response:
        if not app.config["PUBLIC_DOWNLOADS"]:
            if not current_user or not current_user.admin:
                return make_api_response(403, "Forbidden", "Downloading is not enabled")
        song_id = args.get("id")
        get_song_or_abort(song_id)
        new_token = create_access_token(
            {"id": str(song_id)}, expires_delta=timedelta(seconds=10)
        )
        return make_api_response(
            200, None, content={"download_token": new_token, "id": song_id}
        )


@api.resource("/register")
class RegisterController(rest.Resource):
    @parser.use_kwargs(UserSchema())
    def post(self, username: str, password: str) -> Response:
        validator = valid_username(username)
        if not validator.valid:
            return make_api_response(422, "Unprocessable Entity", validator.reason)
        # if no users registered, make first one admin
        make_admin = User.select().count() == 0
        new_user = register(username, password, admin=make_admin)
        if new_user:
            return make_api_response(
                200, None, f'User "{username}" successfully registered'
            )
        return make_api_response(500, "Server Error", "Issue registering user")


@api.resource("/user")
class UserController(rest.Resource):
    @jwt_required
    def get(self) -> Response:
        if current_user:
            content = {
                "username": current_user.username,
                "admin": current_user.admin,
            }
            return make_api_response(200, None, content=content)
        return make_api_response(500, "Server Error", "Issue loading user")
