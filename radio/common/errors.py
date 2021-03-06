from typing import NamedTuple

from flask import Response

from radio import jwt
from radio.common.utils import make_api_response


class Validator(NamedTuple):
    valid: bool
    reason: str


@jwt.expired_token_loader
def expired_token_loader(token: dict) -> Response:
    token_type = token["type"]
    return make_api_response(401, f"The {token_type} token has expired")


@jwt.invalid_token_loader
def invalid_token_loader(error: str) -> Response:
    return make_api_response(400, error)


@jwt.unauthorized_loader
def unauthorized_loader(error: str) -> Response:
    return make_api_response(401, error)


@jwt.user_loader_error_loader
def user_loader(identity: str):
    return make_api_response(401, f"User {identity} not found")
