from datetime import timedelta
from typing import Dict

import bcrypt
import flask_restful as rest
from flask import Blueprint, Response, jsonify
from flask_jwt_extended import (JWTManager, create_access_token,
                                create_refresh_token, current_user,
                                jwt_optional, jwt_refresh_token_required,
                                jwt_required)
from webargs import fields
from webargs.flaskparser import parser, use_args, use_kwargs

from radio.common.errors import webargs_error
from radio.common.utils import make_api_response, valid_username
from radio.controllers.songs import request_args, validate_song
from radio.models import *

parser.error_handler(webargs_error)

jwt = JWTManager(app)
blueprint = Blueprint('auth', __name__)
api = rest.Api(blueprint)


@jwt.user_loader_callback_loader
@db_session
def user_loader_callback(identity: str):
    user = User.get(id=identity)
    if not user:
        return None

    return user


@jwt.expired_token_loader
def expired_token_loader(token: str) -> Response:
    token_type = token['type']
    return make_api_response(401, 'Unauthorized', f'The {token_type} token has expired')


@jwt.invalid_token_loader
def invalid_token_loader(error: str) -> Response:
    return make_api_response(422, 'Unprocessable Entity', error)


@jwt.unauthorized_loader
def unauthorized_loader(error: str) -> Response:
    return make_api_response(401, 'Unauthorized', error)


@jwt.user_loader_error_loader
def user_loader(identity: str):
    return make_api_response(404, 'Not Found', f"User {identity} not found")


auth_args = {
    'username': fields.Str(required=True),
    'password': fields.Str(required=True)
}


@db_session
def do_signin(username: str, password: str) -> Response:
    user: User = User.get(username=username)
    if user:
        if bcrypt.checkpw(password.encode('utf-8'), user.hash.encode('utf8')):
            # expires = timedelta(days=365)
            # expires_delta=expires
            ret = {
                'access_token': create_access_token(identity=str(user.id), fresh=True),
                'refresh_token': create_refresh_token(identity=str(user.id)),
                'username': user.username,
                'admin': user.admin
            }
            return ret, 200

    return make_api_response(401, 'Unauthorized', 'Invalid credentials')


class LoginController(rest.Resource):
    @db_session
    @use_kwargs(auth_args, locations=('json',))
    def post(self, username: str, password: str) -> Response:
        return do_signin(username, password)


class RefreshController(rest.Resource):
    @db_session
    @jwt_refresh_token_required
    def post(self) -> Response:
        if current_user:
            new_token = create_access_token(
                identity=str(current_user.id), fresh=False)
            ret = {'access_token': new_token,
                   'username': current_user.username,
                   'admin': current_user.admin}
            return ret, 200

        return make_api_response(500, 'Server Error', 'Issue loading user')


class DownloadController(rest.Resource):
    @db_session
    @jwt_optional
    @use_kwargs(request_args, locations=('view_args', 'json', 'querystring'), validate=validate_song)
    def post(self, id: UUID) -> Response:
        print(app.config['PUBLIC_DOWNLOADS'], current_user)
        if not app.config['PUBLIC_DOWNLOADS']:
            if not current_user or not current_user.admin:
                return make_api_response(403, 'Forbidden', 'Downloading is not enabled')

        if not Song.exists(id=id):
            return make_api_response(404, 'Not Found', 'Song was not found')

        new_token = create_access_token(
            {'id': str(id)}, expires_delta=timedelta(seconds=10))
        return jsonify({'download_token': new_token, 'id': id})


class RegisterController(rest.Resource):
    @db_session
    @use_kwargs(auth_args, locations=('json',))
    def post(self, username: str, password: str) -> Response:
        validator = valid_username(username)
        if not validator.valid:
            return make_api_response(422, 'Unprocessable Entity', validator.reason)

        user: User = User.get(username=username)
        if user:
            return make_api_response(409, 'Conflict', 'Username already taken')

        # if no users registered, make first one admin
        make_admin = (User.select().count() == 0)

        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        new_user = User(username=username, hash=hashed.decode(
            'utf-8'), admin=make_admin)

        if new_user:
            return make_api_response(200, None, f'User "{username}" successfully registered')

        return make_api_response(500, 'Server Error', 'Issue registering user')


class AuthTestController(rest.Resource):
    @db_session
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
