from flask import send_from_directory

from radio.common.utils import register_blueprint_prefixed
from radio.controllers import now_playing, songs, auth
from radio.models import *

app.wsgi_app = db_session(app.wsgi_app)

register_blueprint_prefixed(now_playing.blueprint)
register_blueprint_prefixed(songs.blueprint)
register_blueprint_prefixed(auth.blueprint, url_prefix=app.config['SERVER_API_PREFIX'] + '/auth')


@app.route('/static/js/<path:path>')
def send_js(path: str):
    return send_from_directory('static/static/js', path)


@app.route('/static/css/<path:path>')
def send_css(path: str):
    return send_from_directory('static/static/css', path)


@app.route('/<path:path>')
def index(path: str):
    return app.send_static_file('index.html')


if __name__ == '__main__':
    app.run(debug=app.config['DEBUG'])
