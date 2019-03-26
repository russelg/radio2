from datetime import datetime
from typing import Set as _Set
from uuid import UUID, uuid4

from pony import orm
# for use in other files
from pony.orm import (commit,  # pylint: disable=unused-import, redefined-builtin
                      count, db_session, desc, max, select, sum)

from radio import app

db = orm.Database()


class User(db.Entity):
    id: UUID = orm.PrimaryKey(UUID, default=uuid4, auto=True)
    username: str = orm.Required(str, 256, unique=True)
    hash: str = orm.Required(orm.LongStr)  # bcrypt'd
    admin: bool = orm.Required(bool, default=False)
    steamid: int = orm.Optional(int, size=64, unique=True)
    favourites: _Set['Song'] = orm.Set('Song')


class Song(db.Entity):
    id: UUID = orm.PrimaryKey(UUID, default=uuid4, auto=True)
    filename: str = orm.Required(str, 256, unique=True)
    artist: str = orm.Required(orm.LongStr, lazy=False)
    title: str = orm.Required(orm.LongStr, lazy=False)
    length: int = orm.Required(int, unsigned=True)
    lastplayed: datetime = orm.Optional(datetime)
    playcount: int = orm.Required(int, default=0, unsigned=True)
    added: datetime = orm.Required(datetime, default=datetime.utcnow)
    favored_by: _Set['User'] = orm.Set(User)
    queue = orm.Set('Queue', hidden=True)


class Queue(db.Entity):
    id: UUID = orm.PrimaryKey(int, auto=True)
    song: 'Song' = orm.Required(Song)
    requested: bool = orm.Required(bool, default=False)
    added: datetime = orm.Required(datetime, default=datetime.utcnow)


orm.set_sql_debug(False)
db.bind(provider=app.config['DB_BINDING'],
        user=app.config['DB_USER'],
        password=app.config['DB_PASSWORD'],
        host=app.config['DB_HOST'],
        database=app.config['DB_DATABASE'])
db.generate_mapping(create_tables=True)
