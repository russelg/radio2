import subprocess
from pathlib import Path
from urllib.error import URLError
from uuid import uuid4

import arrow
import flask
import flask_restful as rest
import mutagen
import pytest
from flask import Blueprint
from marshmallow import Schema, fields
from pony.orm import count, select
from werkzeug.exceptions import HTTPException

# import radio.common.utils
from radio import app
from radio.common import utils


# from radio.common.utils import (
#     make_api_response,
#     get_folder_size,
#     allowed_file_extension,
#     encode_file,
#     EncodeError,
#     get_metadata,
#     humanize_lastplayed,
#     when_requestable,
#     parse_status,
#     filter_default_webargs,
#     get_nonexistant_path,
#     get_self_links,
#     get_song_or_abort,
#     sample_songs_weighted,
#     insert_song,
#     insert_queue,
#     generate_queue,
#     reload_songs,
#     next_song,
# )


def test_make_api_response(client):
    def validate_response(status_code, error=None, body=None):
        resp = utils.make_api_response(
            status_code,
            error,
            description=body.get("description", None) if body else None,
            content=body,
        )
        if not body:
            body = {}
        json = {"status_code": status_code, "error": error, **body}
        assert resp.get_json() == json
        assert resp.status_code == status_code
        return True

    with app.app_context():
        assert validate_response(200)
        assert validate_response(200, body={"description": "OK", "key": "value"})
        # The format used for validation errors
        assert validate_response(
            400, "Invalid Request", {"description": {"query": ["A nested string"]}}
        )


def test_get_folder_size(tmp_path):
    def create_files(path, files, size):
        # create some test files
        for i in range(files):
            tmp = path.joinpath(f"testfile-{i}.file")
            with tmp.open("wb") as f:
                f.seek(size - 1)
                f.write(b"0")

    size = 1024 * 1024
    files = 4

    # no files in directory yet
    assert utils.get_folder_size(tmp_path) == 0
    # create some test files
    create_files(tmp_path, files, size)
    # test cache is working
    assert utils.get_folder_size(tmp_path) == 0
    # clear the LRU cache
    utils.get_folder_size.cache_clear()
    assert utils.get_folder_size(tmp_path) == size * files

    # create some test files in subdirectory (tests recursive)
    sub = tmp_path / "sub"
    sub.mkdir()
    create_files(sub, files, size)
    assert utils.get_folder_size(sub) == size * files
    utils.get_folder_size.cache_clear()
    assert utils.get_folder_size(tmp_path) == size * files * 2


def test_allowed_file_extension(client):
    with app.app_context():
        app.config["ALLOWED_EXTENSIONS"] = ["mp3", "ogg", "flac", "wav", "m4a"]
        assert utils.allowed_file_extension(Path("test.mp3")) is True
        assert utils.allowed_file_extension(Path("test.exe")) is False
        assert utils.allowed_file_extension(Path("test")) is False


def test_encode_file(tmp_path, monkeypatch):
    tmp_file = tmp_path / "file.mp3"
    tmp_file.touch()
    output_dir = tmp_path / "out"
    output_dir.mkdir()
    output_file = output_dir / "file.ogg"

    def subprocess_success_call(args):
        # create the output file like ffmpeg would
        output_file.touch()
        return 0

    monkeypatch.setattr(subprocess, "call", subprocess_success_call)

    with app.app_context():
        app.config["PATH_MUSIC"] = output_dir
        assert utils.encode_file(tmp_file) == output_file
        assert output_file.exists()
        assert tmp_file.exists()

        # remove output file for next test
        output_file.unlink()

        assert utils.encode_file(tmp_file, remove_original=True) == output_file
        assert output_file.exists()
        assert not tmp_file.exists()

        # return code of 1 indicates an error encoding
        monkeypatch.setattr(subprocess, "call", lambda args: 1)
        with pytest.raises(utils.EncodeError):
            utils.encode_file(tmp_file)


def test_get_metadata(monkeypatch, make_test_song, make_tmp_file):
    tmp_file = make_tmp_file("file.mp3")

    class FDict(dict):
        def __init__(self, *a, **k):
            super().__init__(*a, **k)
            self.__dict__ = self

    def mutagen_metadata(*args, **kwargs):
        # fake a mutagen metadata object
        return FDict(title=["Title"], artist=["Artist"], info=FDict(length=100))

    with monkeypatch.context() as m:
        m.setattr(mutagen, "File", mutagen_metadata)
        assert utils.get_metadata(tmp_file) == make_test_song(path=tmp_file)

    # test that invalid file gets deleted
    assert utils.get_metadata(tmp_file) is None
    assert not tmp_file.exists()


def test_humanize_lastplayed():
    assert utils.humanize_lastplayed(0) == "Never before"
    past = arrow.now().shift(minutes=-30)
    assert utils.humanize_lastplayed(past) == past.humanize()
    assert utils.humanize_lastplayed(past.timestamp) == past.humanize()


def test_when_requestable():
    now = arrow.now()
    # song is not requestable yet
    assert utils.when_requestable(now.shift(minutes=-10).timestamp, 100) > now
    # song is requestable
    assert utils.when_requestable(now.shift(minutes=-40).timestamp, 100) < now


def test_parse_status(monkeypatch):
    class DummyFile:
        def __init__(self, body):
            self.body = body

        def read(self):
            return self.body

    def error(url):
        raise URLError(url)

    result_default = {"Online": False, "Current Song": ""}
    result_success = {
        "Online": True,
        "Current Song": "Song Title",
        "Stream Title": "Radio",
        "Stream Description": "Description",
        "Content Type": "audio/mpeg",
        "Current Listeners": "10",
        "Peak Listeners": "100",
        "Stream Genre": "Genre",
    }
    url = "http://icecast/endpoint.mp3"

    xml = """<?xml version="1.0" encoding="UTF-8"?>
<playlist xmlns="http://xspf.org/ns/0/" version="1">
  {}
</playlist>
"""

    response_valid = xml.format(
        f"""
<title/>
<creator/>
  <trackList>
    <track>
      <location>{url}</location>
      <title>{result_success["Current Song"]}</title>
      <annotation>Stream Title: {result_success["Stream Title"]}
Stream Description: {result_success["Stream Description"]}
Content Type:{result_success["Content Type"]}
Current Listeners: {result_success["Current Listeners"]}
Peak Listeners: {result_success["Peak Listeners"]}
Stream Genre: {result_success["Stream Genre"]}
Unpaired Example</annotation>
      <info>{url}</info>
    </track>
  </trackList>
"""
    )

    monkeypatch.setattr("urllib.request.urlopen", DummyFile)
    success = utils.parse_status(response_valid)
    assert success == result_success

    monkeypatch.setattr("urllib.request.urlopen", error)
    assert utils.parse_status(url) == result_default

    response_missing_tracklist = xml.format("")
    response_missing_track = xml.format("<trackList/>")
    response_empty_track = xml.format("<trackList><track/></trackList>")
    response_missing_annontation = xml.format(
        f"<trackList><track><title>Song Title</title></track></trackList>"
    )

    monkeypatch.setattr("urllib.request.urlopen", DummyFile)
    for resp in [
        "",  # invalid XML
        response_missing_tracklist,
        response_missing_track,
        response_empty_track,
        response_missing_annontation,
    ]:
        fail = utils.parse_status(resp)
        assert fail == result_default


def test_filter_default_webargs():
    class TestSchema(Schema):
        int = fields.Int(missing=1)
        str = fields.Str(default="str")

        class Meta:
            strict = True

    assert utils.filter_default_webargs(args=TestSchema(), int=1) == {}
    assert utils.filter_default_webargs(args=TestSchema(), int=1, str="str") == {}
    assert utils.filter_default_webargs(args=TestSchema(), int=2, not_in_args=True) == {
        "int": 2,
    }


def test_get_nonexistant_path(tmp_path):
    tmp_file = tmp_path / "file.txt"
    assert utils.get_nonexistant_path(tmp_file) == tmp_file
    tmp_file.touch()
    tmp_file_1 = tmp_path / "file-1.txt"
    assert utils.get_nonexistant_path(tmp_file) == tmp_file_1
    tmp_file_1.touch()
    assert utils.get_nonexistant_path(tmp_file) == tmp_path / "file-2.txt"


def test_get_self_links():
    test_app = flask.Flask(__name__)
    test_app.config.update(
        {"SERVER_NAME": "test", "SERVER_API_PREFIX": "", "TESTING": True}
    )

    class TestController(rest.Resource):
        def get(self):
            return utils.get_self_links(api, self)

    with test_app.test_client() as client:
        with test_app.app_context():
            blueprint = Blueprint("test", __name__)
            api = rest.Api(blueprint)
            api.add_resource(TestController, "/test")
            test_app.register_blueprint(blueprint)
            assert client.get("/test").get_json() == {"_self": "http://test/test"}


def test_get_song_or_abort(db, client, make_test_song):
    song = db.Song(**make_test_song(filename="test.ogg"))
    db.commit()
    with app.app_context():
        assert utils.get_song_or_abort(song.id) == song
        with pytest.raises(HTTPException):
            utils.get_song_or_abort(uuid4())


def test_sample_songs_weighted(make_db_test_songs):
    assert len(utils.sample_songs_weighted()) == 0
    make_db_test_songs(10)
    assert len(utils.sample_songs_weighted(5)) == 5
    assert len(utils.sample_songs_weighted(100)) == 10


def test_insert_song(db, monkeypatch, make_test_song, make_tmp_file):
    tmp_file = make_tmp_file("file.ogg")

    monkeypatch.setattr(
        utils, "get_metadata", lambda file: make_test_song(path=tmp_file),
    )
    inserted_song = utils.insert_song(tmp_file)
    database_song = db.Song.get(filename=tmp_file.name)
    assert inserted_song == database_song
    # duplicate
    inserted_song = utils.insert_song(tmp_file)
    assert inserted_song == database_song
    # duplicate is removed
    assert not tmp_file.exists()

    # file with no metadata is removed
    tmp_file.touch()
    monkeypatch.setattr(utils, "get_metadata", lambda file: None)
    assert utils.insert_song(tmp_file) is None
    assert not tmp_file.exists()


def test_insert_queue(db, make_db_test_songs):
    songs = make_db_test_songs(10)
    utils.insert_queue(songs)
    for song in songs:
        assert db.Queue.exists(song=song)


def test_generate_queue(db, make_db_test_songs):
    make_db_test_songs(10)

    # no queue, should generate 6 songs.
    utils.generate_queue()
    assert count(db.Queue.select()) == 6

    # hit random threshold
    utils.generate_queue()
    assert count(db.Queue.select()) == 6

    # remove some queue items
    for q in db.Queue.select()[:3]:
        q.delete()
    db.commit()

    # add enough to meet threshold
    utils.generate_queue()
    assert count(db.Queue.select()) == 5


def test_reload_songs(db, tmp_path, monkeypatch, make_test_song):
    def mock_insert_song(filename, i):
        db.Song(**make_test_song(filename=filename.name, i=i))
        db.commit()

    monkeypatch.setattr(
        utils,
        "insert_song",
        lambda filename: mock_insert_song(filename, int(filename.stem[-1])),
    )

    files = []
    start = 0
    # loop is done to hit the following branches on the first run:
    #   - insert all files if no songs in database
    #   - generate queue if it is empty
    # subsequent run makes sure we hit songs_to_add/remove
    while start < 10:
        for i in range(start, start + 5):
            file = tmp_path / f"file-{i}.ogg"
            file.touch()
            files.append(file)
        utils.reload_songs(tmp_path)
        songs = select(song.filename for song in db.Song)
        for file in files:
            assert file.name in songs
        start += 5

    # test removing songs from database that are not on the file system
    for i in range(start, start + 5):
        mock_insert_song(tmp_path / f"file-{i}.ogg", i)
    utils.reload_songs(tmp_path)


def test_next_song(db, make_db_test_songs):
    # next_song returns None when no songs exist
    result = utils.next_song()
    assert result is None

    make_db_test_songs(10)
    utils.generate_queue()
    # remember first queue item
    queue_itm = db.Queue.select().first()
    queue_id = queue_itm.id
    queue_song = queue_itm.song
    playcount = queue_song.playcount
    lastplayed = queue_song.lastplayed

    result = utils.next_song()
    assert not db.Queue.exists(id=queue_id)
    assert result.name == queue_song.filename
    assert queue_song.playcount > playcount
    assert (
        queue_song.lastplayed > lastplayed
        if lastplayed
        else queue_song.lastplayed is not None
    )


def test_queue_status(db, make_db_test_songs):
    song = make_db_test_songs(1)[0]
    status = utils.queue_status(song)
    assert status.type is utils.QueueType.NONE

    db.Queue(song=song, requested=True)
    status = utils.queue_status(song)
    assert status.type is utils.QueueType.USER

    # pop the first queue song
    utils.next_song()
    utils.insert_queue([song])
    status = utils.queue_status(song)
    assert status.type is utils.QueueType.NORMAL
