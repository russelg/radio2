import dataclasses
import datetime
from pathlib import Path

import arrow
from authlib.integrations.flask_client import OAuth
from flask import Flask
from flask.json import JSONEncoder
from flask_jwt_extended import JWTManager
from flask_redis import FlaskRedis
from werkzeug.middleware.proxy_fix import ProxyFix

from .config import Config

app = Flask(__name__)

# enable https urls etc.
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_for=1)

app.config.from_object(Config())
# Make all paths into Path objects for convenience
app.config.update(
    PATH_MUSIC=Path(app.config["PATH_MUSIC"]),
    PATH_ENCODE=Path(app.config["PATH_ENCODE"]),
    PATH_FFMPEG_BINARY=Path(app.config["PATH_FFMPEG_BINARY"]),
)
jwt = JWTManager(app)
redis_client = FlaskRedis(app)
oauth = OAuth(app)

if app.config.get("AUTH_OPENID_ENABLED", False):
    oauth.register(
        name="auth",
        client_id=app.config["AUTH_CLIENT_ID"],
        client_secret=app.config["AUTH_CLIENT_SECRET"],
        server_metadata_url=app.config["AUTH_SERVER_METADATA_URL"],
        client_kwargs={"scope": "openid profile"},
    )


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
