import bcrypt
import flask_restful as rest
from flask import Blueprint, Response
from flask_jwt_extended import JWTManager, create_access_token, jwt_refresh_token_required, create_refresh_token, \
    jwt_required, current_user
from webargs import fields
from webargs.flaskparser import parser, use_kwargs

from radio.common.errors import webargs_error
from radio.common.utils import make_error
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
                'username': user.username
            }
            return ret, 200

    return make_error(401, 'Unauthorized', 'Invalid credentials')


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
            new_token = create_access_token(identity=str(current_user.id), fresh=False)
            ret = {'access_token': new_token, 'username': current_user.username}
            return ret, 200

        return make_error(500, 'Server Error', 'Issue loading user')


class RegisterController(rest.Resource):
    @db_session
    @use_kwargs(auth_args, locations=('json',))
    def post(self, username: str, password: str) -> Response:
        user: User = User.get(username=username)
        if user:
            return make_error(409, 'Conflict', 'Username already taken')

        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        new_user = User(username=username, hash=hashed.decode('utf-8'))
        if new_user:
            return make_error(200, None, f'User "{username}" successfully registered')


class AuthTestController(rest.Resource):
    @db_session
    @jwt_required
    def get(self) -> Response:
        if current_user:
            return make_error(200, None, f'Authorized as "{current_user.username}"')

        return make_error(500, 'Server Error', 'Issue loading user')


api.add_resource(LoginController, '/login')
api.add_resource(RefreshController, '/refresh')
api.add_resource(RegisterController, '/register')
api.add_resource(AuthTestController, '/test')
