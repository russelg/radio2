import dataclasses
import datetime

import arrow
from flask import Flask
from flask.json import JSONEncoder
from flask_jwt_extended import JWTManager

from .config import Config

app = Flask(__name__)
app.config.from_object(Config)
jwt = JWTManager(app)


class CustomJSONEncoder(JSONEncoder):
    def default(self, obj):
        try:
            if dataclasses.is_dataclass(obj):
                return dataclasses.asdict(obj)
            if isinstance(obj, datetime):
                return arrow.get(obj).isoformat()
            iterable = iter(obj)
        except TypeError:
            pass
        else:
            return list(iterable)
        return super().default(obj)


app.config['JSON_SORT_KEYS'] = False
app.json_encoder = CustomJSONEncoder
# toolbar = DebugToolbarExtension(app)
