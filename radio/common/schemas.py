from dataclasses import dataclass, make_dataclass, field
from datetime import datetime
from typing import Optional, Union
from uuid import UUID

from marshmallow import Schema, fields, validate
from radio import app
from radio import models as db


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
    query = fields.Str(missing=None, validate=validate.Length(min=1))
    limit = fields.Int(
        missing=app.config.get("SONGS_PER_PAGE", 50),
        validate=lambda a: 0 < a <= app.config.get("SONGS_PER_PAGE", 50),
    )


class FavouriteSchema(SongQuerySchema):
    user = fields.Str(required=True)


class DownloadSchema(SongQuerySchema):
    token = fields.Str(required=True)


class SongBasicSchema(StrictSchema):
    id = fields.UUID(required=True)


class UserSchema(StrictSchema):
    username = fields.Str(required=True)
    password = fields.Str(required=True)
