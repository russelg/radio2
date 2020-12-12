from typing import Dict
from urllib.parse import urljoin
from uuid import UUID

import flask_restful as rest
from authlib.integrations.base_client import OAuthError
from flask import Blueprint
from flask import Response
from flask import request
from flask_jwt_extended import create_access_token
from flask_jwt_extended import decode_token
from flask_jwt_extended.exceptions import JWTExtendedException
from jwt import PyJWTError
from marshmallow import ValidationError
from marshmallow import fields
from pony.orm import commit
from pony.orm import db_session

from radio import oauth
from radio.common.errors import Validator
from radio.common.schemas import CallbackSchema
from radio.common.schemas import TokenSchema
from radio.common.users import get_sign_in_body
from radio.common.users import user_exists
from radio.common.users import valid_username
from radio.common.utils import make_api_response
from radio.common.utils import parser
from radio.database import User

blueprint = Blueprint("openid", __name__)
api = rest.Api(blueprint)


@api.resource("/login")
class LoginController(rest.Resource):
    def get(self) -> Response:
        try:
            redirect_uri = urljoin(request.url_root, "openid/callback")
            url = oauth.auth.create_authorization_url(redirect_uri)
            oauth.auth.save_authorize_data(request, redirect_uri=redirect_uri, **url)
            return make_api_response(200, content=url)
        except:
            return make_api_response(400, "Unable to login using OpenID")


def make_linking_token(subject, preferred_username, reason):
    return {
        "link": True,
        "id": subject,
        "username": preferred_username,
        "reason": reason
    }


def create_user(subject, preferred_username) -> User:
    make_admin = User.select().count() == 0
    user = User(id=subject, username=preferred_username, admin=make_admin)
    commit()
    return user


@db_session
def validate_linking_token(args: Dict[str, UUID]) -> bool:
    try:
        decoded = decode_token(args["token"])
        if "id" in decoded["identity"] and "link" in decoded["identity"]:
            if User.get(id=decoded["identity"]["id"]):
                raise ValidationError("User is already linked")
            return True
    except (PyJWTError, JWTExtendedException):
        pass
    raise ValidationError("Token is invalid")


def get_long_validation(preferred_username):
    if user_exists(preferred_username):
        return Validator(False, "Your username is not available. Please provide a different username to use.")
    return valid_username(preferred_username)


@api.resource("/callback")
class CallbackController(rest.Resource):
    @parser.use_args(CallbackSchema())
    def get(self, args) -> Response:
        try:
            token = oauth.auth.authorize_access_token(**args)
            id_token = oauth.auth.parse_id_token(token)
            subject = id_token.get("sub")
            if not subject:
                raise OAuthError(description="No user details provided")
        except OAuthError as e:
            return make_api_response(400, e.description)

        user: User = User.get(id=subject)

        preferred_username = id_token.get("preferred_username")
        if not user and preferred_username:
            valid = get_long_validation(preferred_username)
            if not valid.valid:
                token_body = make_linking_token(subject, preferred_username, valid.reason)
                linking_token = create_access_token(token_body)
                return make_api_response(400, valid.reason, content={
                    "token": linking_token
                })
            user = create_user(subject, preferred_username)

        if user:
            tokens = get_sign_in_body(user)
            return make_api_response(200, content=tokens)

        return make_api_response(400, "Unable to login using OpenID")


@api.resource("/link")
class LinkController(rest.Resource):
    @parser.use_kwargs(TokenSchema(), validate=validate_linking_token)
    def get(self, token: str):
        decoded = decode_token(token)["identity"]
        return make_api_response(200, decoded["reason"], content=decoded)

    @parser.use_kwargs({'username': fields.Str(required=True), 'token': fields.Str(required=True)},
                       validate=validate_linking_token)
    def post(self, username: str, token: str):
        decoded = decode_token(token)["identity"]

        valid = get_long_validation(username)
        if not valid.valid:
            decoded = make_linking_token(decoded["id"], username, valid.reason)
            return make_api_response(400, valid.reason, content=decoded)

        user = create_user(decoded["id"], username)
        tokens = get_sign_in_body(user)
        return make_api_response(200, content=tokens)
