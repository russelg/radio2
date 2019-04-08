from datetime import timedelta
from typing import Dict, Union
from uuid import UUID

import flask_restful as rest
from flask import Blueprint, Response
from flask_jwt_extended import (create_access_token, current_user,
                                jwt_optional, jwt_refresh_token_required,
                                jwt_required)

from radio import app
from radio import models as db
from radio.common.schemas import SongBasicSchema, UserSchema
from radio.common.users import (refresh_token, register, sign_in,
                                valid_registration)
from radio.common.utils import get_song_or_abort, make_api_response, parser
from radio.controllers.songs import validate_song

blueprint = Blueprint('auth', __name__)
api = rest.Api(blueprint)


class LoginController(rest.Resource):
    @parser.use_kwargs(UserSchema())
    def post(self, username: str, password: str) -> Response:
        tokens = sign_in(username, password)
        if tokens:
            return make_api_response(200, None, content=tokens)

        return make_api_response(401, 'Unauthorized', 'Invalid credentials')


class RefreshController(rest.Resource):
    @jwt_refresh_token_required
    def post(self) -> Response:
        tokens = refresh_token(current_user)
        if tokens:
            return make_api_response(200, None, content=tokens)

        return make_api_response(500, 'Server Error', 'Issue loading user')


class DownloadController(rest.Resource):
    @jwt_optional
    @parser.use_args(SongBasicSchema(), locations=('view_args', 'json', 'querystring'), validate=validate_song)
    def post(self, args: Dict[str, UUID]) -> Response:
        if not app.config['PUBLIC_DOWNLOADS']:
            if not current_user or not current_user.admin:
                return make_api_response(403, 'Forbidden', 'Downloading is not enabled')

        song_id = args['id']
        get_song_or_abort(song_id)

        new_token = create_access_token(
            {'id': str(song_id)}, expires_delta=timedelta(seconds=10))

        return make_api_response(200, None, content={
            'download_token': new_token,
            'id': song_id
        })


class RegisterController(rest.Resource):
    @parser.use_kwargs(UserSchema())
    def post(self, username: str, password: str) -> Response:
        valid_resp: Union[bool, Response] = valid_registration(
            username, response=True)
        if valid_resp is not True:
            return valid_resp

        # if no users registered, make first one admin
        make_admin = (db.User.select().count() == 0)
        new_user = register(username, password,
                            admin=make_admin, validate=False)

        if new_user:
            return make_api_response(200, None, f'User "{username}" successfully registered')

        return make_api_response(500, 'Server Error', 'Issue registering user')


class AuthTestController(rest.Resource):
    @jwt_required
    def get(self) -> Response:
        if current_user:
            admin = ' You are an admin.' if current_user.admin else ''
            return make_api_response(200, None, f'Authorized as "{current_user.username}".{admin}')

        return make_api_response(500, 'Server Error', 'Issue loading user')


api.add_resource(LoginController, '/login')
api.add_resource(DownloadController, '/download')
api.add_resource(RefreshController, '/refresh')
api.add_resource(RegisterController, '/register')
api.add_resource(AuthTestController, '/test')
