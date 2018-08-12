from flask import Response
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import HTTPException

from radio import app
from radio.common.utils import make_error

jwt = JWTManager(app)


def webargs_error(error, req, schema):
    resp = make_error(error.status_code,
                      'Unprocessable Entity', error.messages)
    raise HTTPException(description=resp.response, response=resp)

