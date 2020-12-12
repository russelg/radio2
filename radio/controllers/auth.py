import flask_restful as rest
from flask import Blueprint
from flask import Response
from flask_jwt_extended import current_user
from flask_jwt_extended import jwt_refresh_token_required
from flask_jwt_extended import jwt_required

from radio.common.schemas import UserSchema
from radio.common.users import refresh_token
from radio.common.users import register
from radio.common.users import sign_in
from radio.common.users import valid_username
from radio.common.utils import make_api_response
from radio.common.utils import parser
from radio.database import User

blueprint = Blueprint("auth", __name__)
api = rest.Api(blueprint)


@api.resource("/login")
class LoginController(rest.Resource):
    @parser.use_kwargs(UserSchema())
    def post(self, username: str, password: str) -> Response:
        tokens = sign_in(username, password)
        if tokens:
            return make_api_response(200, content=tokens)
        return make_api_response(401, "Invalid credentials")


@api.resource("/refresh")
class RefreshController(rest.Resource):
    @jwt_refresh_token_required
    def post(self) -> Response:
        tokens = refresh_token(current_user)
        if tokens:
            return make_api_response(200, content=tokens)
        return make_api_response(500, "Failed to refresh token")


@api.resource("/register")
class RegisterController(rest.Resource):
    @parser.use_kwargs(UserSchema())
    def post(self, username: str, password: str) -> Response:
        validator = valid_username(username)
        if not validator.valid:
            return make_api_response(400, validator.reason)
        # if no users registered, make first one admin
        make_admin = User.select().count() == 0
        new_user = register(username, password, admin=make_admin)
        if new_user:
            return make_api_response(200, f'User "{username}" successfully registered')
        return make_api_response(500, "Failed to register user")


@api.resource("/user")
class UserController(rest.Resource):
    @jwt_required
    def get(self) -> Response:
        if current_user:
            content = {
                "username": current_user.username,
                "admin": current_user.admin,
            }
            return make_api_response(200, content=content)
        return make_api_response(500, "Failed to get user")
