import dataclasses
import datetime
from pathlib import Path

import arrow
from flask import Flask
from flask.json import JSONEncoder
from flask_jwt_extended import JWTManager
from flask_redis import FlaskRedis

from .config import Config

app = Flask(__name__)
app.config.from_object(Config())
# Make all paths into Path objects for convenience
app.config.update(
    PATH_MUSIC=Path(app.config["PATH_MUSIC"]),
    PATH_ENCODE=Path(app.config["PATH_ENCODE"]),
    PATH_FFMPEG_BINARY=Path(app.config["PATH_FFMPEG_BINARY"]),
)
jwt = JWTManager(app)
redis_client = FlaskRedis(app)


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


app.config["JSON_SORT_KEYS"] = False
app.json_encoder = CustomJSONEncoder
# toolbar = DebugToolbarExtension(app)
