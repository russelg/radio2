import re
from functools import wraps
from typing import Dict
from typing import Optional

import bcrypt
from flask import Response
from flask_jwt_extended import create_access_token
from flask_jwt_extended import create_refresh_token
from flask_jwt_extended import get_jwt_claims
from flask_jwt_extended import verify_jwt_in_request
from jwt.exceptions import ExpiredSignatureError
from pony.orm import commit
from pony.orm import db_session

from radio import jwt
from radio.common.errors import Validator
from radio.common.utils import make_api_response
from radio.database import User


@jwt.user_loader_callback_loader
@db_session
def user_loader_callback(identity: str):
    user = User.get(id=identity)
    return user or None


@jwt.user_claims_loader
def add_claims_to_access_token(identity: str):
    if isinstance(identity, str):
        user = user_loader_callback(identity)
        claims = {"roles": [], "username": user.username}
        if user.admin:
            claims["roles"].append("admin")
        return claims
    return {}


@db_session
def sign_in(username: str, password: str) -> Optional[Dict]:
    """Authenticate user details, returning authorization tokens and user metadata

    :param str username: username to authenticate
    :param str password: password to authenticate
    :return: dict containing auth tokens and user metadata if valid else None
    :rtype: dict
    """
    user: User = User.get(username=username)
    if user:
        if bcrypt.checkpw(password.encode("utf-8"), user.hash.encode("utf8")):
            return get_sign_in_body(user)
    return None


@db_session
def get_sign_in_body(user) -> Optional[Dict]:
    if user:
        return {
            "access_token": create_access_token(identity=str(user.id), fresh=True),
            "refresh_token": create_refresh_token(identity=str(user.id)),
            "username": user.username,
            "admin": user.admin,
        }
    return None


@db_session
def refresh_token(user) -> Optional[Dict]:
    if user:
        new_token = create_access_token(identity=str(user.id), fresh=False)
        return {
            "access_token": new_token,
            "username": user.username,
            "admin": user.admin,
        }
    return None


@db_session
def register(username: str, password: str, admin: bool = False) -> bool:
    """Register a user given a valid username and password

    :param str username: username to register
    :param str password: password to register
    :param bool admin: if the user should be an admin, defaults to False
    :return: True if user was successfully registered, else False
    :rtype: bool
    """
    validator = valid_username(username)
    if not validator.valid:
        return False
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    new_user = User(username=username, hash=hashed.decode("utf-8"), admin=admin)
    # save user to db
    commit()
    return new_user is not None


@db_session
def user_exists(username: str) -> bool:
    """Check if username is taken

    :param str username: username to check
    :return: True if username is taken, else False
    :rtype: bool
    """
    return User.exists(username=username)


def user_is_admin() -> bool:
    """Check if current user is an admin

    :return: True if current user is an admin
    :rtype: bool
    """
    try:
        verify_jwt_in_request()
        claims = get_jwt_claims() or {"roles": []}
        return "admin" in claims["roles"]
    except ExpiredSignatureError:
        return False


def admin_required(fn):
    """Decorator to enforce admin requirement for a response"""

    @wraps(fn)
    def wrapper(*args, **kwargs) -> Response:
        if not user_is_admin():
            return make_api_response(
                403, "Forbidden", "This endpoint can only be accessed by admins"
            )
        return fn(*args, **kwargs)

    return wrapper


def valid_username(username: str) -> Validator:
    """
    Validates the given username meets username requirements.
    Requirements are as follows:
        - Between 3 and 32 (inclusive) characters in length
        - Only contains A-z, 0-9, -, _ and .

    :param str username: username to validate
    :return: dict containing keys `valid` (`bool`) and `reason` (`str`)
    """
    if len(username) < 3:
        return Validator(False, "Username must be at least 3 characters")
    if len(username) >= 32:
        return Validator(False, "Username must be shorter than 32 characters")
    if not re.match(r"^\w(?:\w*(?:[.-]\w+)?)*$", username):
        return Validator(
            False, "Username may only contain the following: A-z, 0-9, -_."
        )
    if user_exists(username):
        return Validator(False, "Username is not available")
    return Validator(True, "Username is valid")
