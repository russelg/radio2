from flask import Response
from werkzeug.exceptions import HTTPException

from radio import app
from radio.common.utils import make_api_response


def webargs_error(error, req, schema, error_status_code, error_headers):
    resp = make_api_response(422, 'Unprocessable Entity', error.messages)
    raise HTTPException(description=resp.response, response=resp)
