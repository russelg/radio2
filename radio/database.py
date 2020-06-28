from radio import app
from radio.models import define_db

db = define_db(
    provider=app.config["DB_BINDING"],
    user=app.config["DB_USER"],
    password=app.config["DB_PASSWORD"],
    host=app.config["DB_HOST"],
    database=app.config["DB_DATABASE"],
)

User = db.User
Song = db.Song
Queue = db.Queue
