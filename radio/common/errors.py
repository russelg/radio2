from flask import Response
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import HTTPException

from radio import app
from radio.common.utils import make_error

jwt = JWTManager(app)


def webargs_error(error):
    resp = make_error(error.status_code,
                      'Unprocessable Entity', error.messages)
    raise HTTPException(description=resp.response, response=resp)


@jwt.expired_token_loader
def expired_token_loader() -> Response:
    return make_error(401, 'Unauthorized', 'The token has expired')


@jwt.invalid_token_loader
def invalid_token_loader(error: str) -> Response:
    return make_error(422, 'Unprocessable Entity', error)


@jwt.unauthorized_loader
def unauthorized_loader(error: str) -> Response:
    return make_error(401, 'Unauthorized', error)


@jwt.user_loader_error_loader
def user_loader(identity: str):
    return make_error(404, 'Not Fount', f"User {identity} not found")
