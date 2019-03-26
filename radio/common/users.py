import re
from functools import wraps
from typing import Dict
from typing import Optional as Optional_
from typing import Union

import bcrypt
from flask import Response
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                get_jwt_claims, verify_jwt_in_request)
from marshmallow import Schema, fields

from radio import jwt
from radio import models as db
from radio.common.errors import Validator
from radio.common.utils import make_api_response


class UserSchema(Schema):
    username = fields.Str(required=True)
    password = fields.Str(required=True)


@jwt.user_loader_callback_loader
@db.db_session
def user_loader_callback(identity: str):
    user = db.User.get(id=identity)
    if not user:
        return None

    return user


@jwt.user_claims_loader
def add_claims_to_access_token(identity: str):
    if isinstance(identity, str):
        user = user_loader_callback(identity)
        if user.admin:
            return {'roles': ['admin']}

        return {'roles': []}
    return {}


@db.db_session
def sign_in(username: str, password: str) -> Optional_[Dict]:
    """Authenticate user details, returning authorization tokens and user metadata

    :param str username: username to authenticate
    :param str password: password to authenticate
    :return: dict containing auth tokens and user metadata if valid else None
    :rtype: dict
    """
    user: db.User = db.User.get(username=username)
    if user:
        if bcrypt.checkpw(password.encode('utf-8'), user.hash.encode('utf8')):
            return {
                'access_token': create_access_token(identity=str(user.id), fresh=True),
                'refresh_token': create_refresh_token(identity=str(user.id)),
                'username': user.username,
                'admin': user.admin
            }

    return None


@db.db_session
def refresh_token(user) -> Optional_[Dict]:
    if user:
        new_token = create_access_token(identity=str(user.id), fresh=False)
        return {'access_token': new_token,
                'username': user.username,
                'admin': user.admin}

    return None


def valid_registration(username: str, response=False) -> Union[bool, Response]:
    validator = valid_username(username)
    if not validator.valid:
        if response:
            return make_api_response(
                422, 'Unprocessable Entity', validator.reason)

        return False

    if user_exists(username):
        if response:
            return make_api_response(409, 'Conflict', 'Username already taken')

        return False

    return True


@db.db_session
def register(username: str, password: str, admin: bool = False, validate: bool = True) -> bool:
    """Register a user given a valid username and password

    :param str username: username to register
    :param str password: password to register
    :param bool admin: if the user should be an admin, defaults to False
    :param bool validate: if sanity checking should be done, defaults to True
    :return: True if user was successfully registered, else False
    :rtype: bool
    """

    if validate:
        valid = valid_registration(username)
        if not valid:
            return False

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    new_user = db.User(username=username, hash=hashed.decode(
        'utf-8'), admin=admin)

    return new_user is not None


def user_exists(username) -> bool:
    """Check if username is taken

    :param bool username: username to check
    :return: True if username is taken, else False
    :rtype: bool
    """

    return db.User.exists(username=username)


def user_is_admin() -> bool:
    """Check if current user is an admin

    :return: True if current user is an admin
    :rtype: bool
    """
    verify_jwt_in_request()
    claims = get_jwt_claims() or {'roles': []}
    return 'admin' in claims['roles']


def admin_required(fn):
    """Decorator to enforce admin requirement for a response"""
    @wraps(fn)
    def wrapper(*args, **kwargs) -> Response:
        if not user_is_admin():
            return make_api_response(403, 'Forbidden', 'This endpoint can only be accessed by admins')
        return fn(*args, **kwargs)
    return wrapper


def valid_username(username: str) -> dict:
    """
    Validates the given username meets username requirements.
    Requirements are as follows:
        - Between 3 and 32 (inclusive) characters in length
        - Only contains A-z, 0-9, -, _ and .

    :param str username: username to validate
    :return: dict containing keys `valid` (`bool`) and `reason` (`str`)
    """
    if len(username) < 3:
        return Validator(False, 'Username must be at least 3 characters')

    if len(username) >= 32:
        return Validator(False, 'Username must be shorter than 32 characters')

    if not re.match(r"^\w(?:\w*(?:[.-]\w+)?)*$", username):
        return Validator(False, 'Username may only contain the following: A-z, 0-9, -_.')

    return Validator(True, '')
