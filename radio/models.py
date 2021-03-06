from datetime import datetime
from uuid import UUID
from uuid import uuid4

from pony.orm import Database
from pony.orm import LongStr
from pony.orm import Optional
from pony.orm import PrimaryKey
from pony.orm import Required
from pony.orm import Set
from pony.orm import set_sql_debug

from radio import app


def define_entities(db):
    class User(db.Entity):
        id: UUID = PrimaryKey(UUID, default=uuid4, auto=True)
        username: str = Required(str, 256, unique=True)
        # optional hash due to openid logins
        hash: str = Optional(LongStr)
        admin: bool = Required(bool, default=False)
        favourites = Set("Song")

    class Song(db.Entity):
        id: UUID = PrimaryKey(UUID, default=uuid4, auto=True)
        filename: str = Required(str, 256, unique=True)
        artist: str = Required(LongStr, lazy=False)
        title: str = Required(LongStr, lazy=False)
        length: int = Required(int, unsigned=True)
        lastplayed: datetime = Optional(datetime)
        playcount: int = Required(int, default=0, unsigned=True)
        added: datetime = Required(datetime, default=datetime.utcnow)
        favored_by = Set(User)
        queue = Set("Queue", hidden=True, cascade_delete=True)

    class Queue(db.Entity):
        id: UUID = PrimaryKey(int, auto=True)
        song: Song = Required(Song)
        requested: bool = Required(bool, default=False)
        added: datetime = Required(datetime, default=datetime.utcnow)


def define_db(*args, **kwargs):
    set_sql_debug(app.debug, True)
    db = Database()
    db.bind(*args, **kwargs)
    define_entities(db)
    db.generate_mapping(create_tables=True)
    return db
