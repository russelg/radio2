from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from marshmallow import Schema
from marshmallow import fields
from marshmallow import validate
from pony.orm import db_session

from radio import app
from radio.database import Song
from radio.database import User


@dataclass
class RequestStatus:
    requestable: bool
    humanized_lastplayed: str = "Never Before"
    reason: Optional[str] = None


@dataclass
class SongMeta(RequestStatus):
    favourited: bool = False


@dataclass
class SongData:
    id: UUID
    artist: str
    title: str
    length: int
    lastplayed: datetime
    playcount: int
    added: datetime
    meta: Optional[RequestStatus] = None
    size: int = 0


class StrictSchema(Schema):
    class Meta:
        strict = True


class SongQuerySchema(StrictSchema):
    page = fields.Int(missing=1)
    query = fields.Str(missing=None, validate=validate.Length(min=2))
    limit = fields.Int(
        missing=app.config.get("SONGS_PER_PAGE", 50),
        validate=lambda a: 0 < a <= app.config.get("SONGS_PER_PAGE", 50),
    )


@db_session
class FavouriteSchema(SongQuerySchema):
    user = fields.Str(
        required=True,
        validate=lambda arg: User.exists(username=arg),
        error_messages={"validator_failed": "User does not exist"},
    )


class TokenSchema(StrictSchema):
    token = fields.Str(required=True)


@db_session
class SongBasicSchema(StrictSchema):
    id = fields.UUID(
        required=True,
        validate=lambda arg: Song.exists(id=arg),
        error_messages={"validator_failed": "Song does not exist"},
    )


class UserSchema(StrictSchema):
    username = fields.Str(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=3))


class CallbackSchema(StrictSchema):
    code = fields.Str(required=True)
    scope = fields.Str(required=True)
    state = fields.Str(required=True)
