from datetime import datetime
from typing import Set as _Set
from uuid import UUID, uuid4

from pony.orm import (
    Database,
    LongStr,
    Optional,
    PrimaryKey,
    Required,
    Set,
    set_sql_debug,
)
from radio import app

db = Database()


class User(db.Entity):
    id: UUID = PrimaryKey(UUID, default=uuid4, auto=True)
    username: str = Required(str, 256, unique=True)
    hash: str = Required(LongStr)  # bcrypt'd
    admin: bool = Required(bool, default=False)
    steamid: int = Optional(int, size=64, unique=True)
    favourites: _Set["Song"] = Set("Song")


class Song(db.Entity):
    id: UUID = PrimaryKey(UUID, default=uuid4, auto=True)
    filename: str = Required(str, 256, unique=True)
    artist: str = Required(LongStr, lazy=False)
    title: str = Required(LongStr, lazy=False)
    length: int = Required(int, unsigned=True)
    lastplayed: datetime = Optional(datetime)
    playcount: int = Required(int, default=0, unsigned=True)
    added: datetime = Required(datetime, default=datetime.utcnow)
    favored_by: _Set["User"] = Set(User)
    queue = Set("Queue", hidden=True)


class Queue(db.Entity):
    id: UUID = PrimaryKey(int, auto=True)
    song: "Song" = Required(Song)
    requested: bool = Required(bool, default=False)
    added: datetime = Required(datetime, default=datetime.utcnow)


set_sql_debug(False)
db.bind(
    provider=app.config["DB_BINDING"],
    user=app.config["DB_USER"],
    password=app.config["DB_PASSWORD"],
    host=app.config["DB_HOST"],
    database=app.config["DB_DATABASE"],
)
db.generate_mapping(create_tables=True)
