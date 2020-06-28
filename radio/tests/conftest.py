from typing import Callable

import pytest
from _pytest.monkeypatch import MonkeyPatch
from flask.testing import FlaskClient
from pony.orm import Database, db_session

from radio import app
from radio.models import define_db


# need to fake the DB before importing from utils, etc.
def fake_db(*args, **kwargs):
    return define_db(provider="sqlite", filename=":memory:")


mpatch = MonkeyPatch()
mpatch.setattr("radio.models.define_db", fake_db)


@pytest.fixture
def db() -> Database:
    from radio.database import db

    db.create_tables()
    with db_session:
        yield db
    db.drop_all_tables(with_all_data=True)


@pytest.fixture
def make_tmp_file(tmp_path):
    def func(filename: str = "file.ogg", touch: bool = True):
        tmp_file = tmp_path / filename
        if touch:
            tmp_file.touch()
        return tmp_file

    return func


@pytest.fixture
def make_test_song() -> Callable[..., dict]:
    def func(i: int = 0, **kwargs):
        suffix = f"-{i}" if i > 0 else ""
        song = {"title": f"Title{suffix}", "artist": f"Artist{suffix}", "length": 100}
        song.update(kwargs)
        return song

    return func


@pytest.fixture
def make_db_test_songs(db, make_test_song) -> Callable[[int], list]:
    def func(count: int):
        songs = [
            db.Song(**make_test_song(filename=f"test-{i}.ogg", i=i))
            for i in range(count)
        ]
        db.commit()
        return songs

    return func


@pytest.fixture
def client() -> FlaskClient:
    app.config["TESTING"] = True

    with app.test_client() as client:
        yield client
