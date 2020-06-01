from pony.orm import db_session

from radio import app
from radio.common.utils import register_blueprint_prefixed
from radio.controllers import auth, now_playing, songs

app.wsgi_app = db_session(app.wsgi_app)

register_blueprint_prefixed(now_playing.blueprint)
register_blueprint_prefixed(songs.blueprint)
register_blueprint_prefixed(
    auth.blueprint, url_prefix=app.config["SERVER_API_PREFIX"] + "/auth"
)

if __name__ == "__main__":
    app.run()
