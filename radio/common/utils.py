import math
import os
import subprocess
from datetime import datetime
from enum import Enum
from functools import lru_cache, partial
from random import choices
from typing import Any, Dict, List, NamedTuple, Optional, Union
from urllib.error import URLError
from urllib.request import urlopen
from uuid import UUID

import arrow
import marshmallow
import mutagen
import xmltodict
from flask import Response, jsonify
from pony.orm import commit, count, db_session, max, select, sum
from webargs import flaskparser
from werkzeug.exceptions import HTTPException

from radio import app
from radio.common.schemas import RequestStatus, SongData
from radio.models import Queue, Song, User

register_blueprint_prefixed = partial(
    app.register_blueprint, url_prefix=app.config["SERVER_API_PREFIX"]
)

parser = flaskparser.FlaskParser()


# I did not want to put this here, but since it uses make_api_response
# there can be some tricky circular dependencies
@parser.error_handler
def webargs_error(error, req, schema, error_status_code, error_headers):
    resp = make_api_response(422, "Unprocessable Entity", error.messages)
    raise HTTPException(description=resp.response, response=resp)


def make_api_response(
    status_code: int,
    error: Union[str, bool, None],
    description: any = None,
    content: Dict = None,
) -> Response:
    """
    Generates a standard response format to use for API responses

    :param status_code: HTTP status code for error
    :param error: short name for error
    :param description: full description of error
    :param content: any other content to include
    :return: a prepared response
    """
    body = {"status_code": status_code, "error": error}
    if description:
        body["description"] = description
    if content is None:
        content = {}
    body.update(content)
    response = jsonify(body)
    response.status_code = status_code
    return response


@lru_cache(maxsize=32)
def get_folder_size(path: str = ".") -> int:
    """
    Calculate the total size of all files in the given path.
    This is cached for performance concerns.

    :param path: path of folder to get size of
    :return: the total size of all files in the given path
    """
    total = 0
    for entry in os.scandir(path):
        total += entry.stat().st_size
    return total


def allowed_file(filename: str) -> bool:
    """
    Check if the given filename is an allowed extension for upload

    :param str filename: Filename to validate
    :return: True if filename is valid
    """
    _, file_extension = os.path.splitext(filename)
    return file_extension[1:].lower() in app.config["ALLOWED_EXTENSIONS"]


def encode_file(filename: str) -> str:
    """
    Encodes a given file and moves it to the correct output directory

    :param str filename: path of file to encode
    :return: full path to encoded file
    """
    encode_folder = app.config["PATH_ENCODE"]
    base_filename = os.path.basename(filename)
    name, ext = os.path.splitext(base_filename)
    output_path = get_nonexistant_path(
        os.path.join(app.config["PATH_MUSIC"], f"{name}.ogg")
    )

    subprocess.call(
        [
            app.config["PATH_FFMPEG_BINARY"],
            "-i",
            filename,
            "-map_metadata",
            "0",
            "-acodec",
            "libvorbis",
            "-q:a",
            str(app.config["SONG_QUALITY_LVL"]),
            "-vn",
            output_path,
        ],
        cwd=encode_folder,
    )

    # full_path = os.path.join(encode_folder, name_ogg)
    # new_path = get_nonexistant_path(os.path.join(app.config["PATH_MUSIC"], name_ogg))
    # shutil.move(full_path, new_path)
    # print(f"{full_path} => {new_path}")

    # remove the source file if it was in the encode directory
    filepath = os.path.join(encode_folder, base_filename)
    if os.path.isfile(filepath):
        os.remove(filepath)

    return output_path


@db_session
def sample_songs_weighted(num: int = 6) -> List[Song]:
    """
    Samples a selection of songs from the Songs table, weighted by playcount.
    This means songs that have been played less have a higher chance of being put in the queue.

    :param int num: number of songs to sample
    :return: list of songs sampled from Songs table, weighted by playcount
    """
    songs = Song.select()[:]
    if len(songs) < num:
        return songs

    weights = []
    max_plays = max(s.playcount for s in Song) + 1
    for song in songs:
        weights.append(abs(max_plays - song.playcount))

    return choices(songs, weights=weights, k=num)


def get_metadata(filename: str) -> Optional[Dict[str, Any]]:
    """
    Returns the associated tags for a given music file.

    :param str filename: file to read tags from
    :return: dict containing music file tags
    """
    metadata = mutagen.File(filename, easy=True)
    if not metadata or "title" not in metadata or "artist" not in metadata:
        if os.path.isfile(filename):
            os.remove(filename)
        return None

    title = metadata["title"][0]
    artist = metadata["artist"][0]
    return {
        "title": title,
        "artist": artist,
        "path": filename,
        "length": metadata.info.length,
    }


def get_song_or_abort(song_id: Optional[UUID]) -> Song:
    song = Song.get(id=song_id)
    if not song:
        resp = make_api_response(404, "Not Found", "Song does not exist")
        raise HTTPException(description=resp.get_data(as_text=True), response=resp)
    return song


@db_session
def insert_song(filename: str) -> Optional[Song]:
    """
    Adds a song to the database

    :param str filename: music file to add
    """
    print("inserting song", filename)
    filepath = os.path.join(app.config["PATH_MUSIC"], filename)
    meta = get_metadata(filepath)
    if meta:
        # check dupe
        song = Song.get(artist=meta["artist"], title=meta["title"])
        if song:
            print(filepath, "is a dupe, removing...")
            if os.path.isfile(filepath):
                os.remove(filepath)
        else:
            song = Song(
                filename=filename,
                artist=meta["artist"],
                title=meta["title"],
                length=int(meta["length"]),
            )
            commit()
        return song
    return None


@db_session
def insert_queue(songs: List[Song]) -> None:
    """
    Adds the given songs to the queue

    :param songs: list of songs to add
    """
    for song in songs:
        Queue(song=song)
    commit()


@db_session
def generate_queue() -> None:
    """
    Fills the queue with songs, using the weighted sample method
    """
    queue = Queue.select()[:]
    if queue:
        randoms = sum(not entry.requested for entry in queue)
        reqs = len(queue) - randoms
        threshold = math.ceil((10 - min(reqs, 10)) / 2)

        to_add = abs(threshold - randoms)

        if randoms >= threshold:
            return

        insert_queue(sample_songs_weighted(to_add))
    else:
        insert_queue(sample_songs_weighted())


@db_session
def reload_songs() -> None:
    """
    Keeps music directory and database in sync.
    This is done by removing songs that exist in the database, but not on the filesystem.
    Also adds any songs found in the filesystem that are not present in the database.
    """
    os_songs = [
        f for f in os.listdir(app.config["PATH_MUSIC"]) if not f.startswith(".")
    ]
    if count(s for s in Song) <= 0:
        for filename in os_songs:
            insert_song(filename)

    if count(s for s in Queue) <= 0:
        generate_queue()

    db_songs = select(song.filename for song in Song)[:]

    songs_to_add = []
    songs_to_remove = []

    for song in os_songs:
        if song not in db_songs:
            songs_to_add.append(song)

    for song in db_songs:
        if song not in os_songs:
            songs_to_remove.append(song)

    for song in songs_to_remove:
        db_song = Song.get(filename=song)
        if db_song:
            queue_song = Queue.get(song=db_song)
            if queue_song:
                queue_song.delete()

            for user in User.select():
                user.favourites.remove(db_song)

            db_song.delete()

    print("songs to add", songs_to_add)
    print("songs to remove", songs_to_remove)

    for filename in songs_to_add:
        insert_song(filename)


@db_session
def next_song() -> str:
    """
    Gets the song to play next from the queue

    :return: path to song
    """
    generate_queue()

    try:
        queue_entry = Queue.select().sort_by(Queue.id)[:1][0]
    except IndexError:
        return None

    song = Song[queue_entry.song.id]
    song.playcount += 1
    song.lastplayed = datetime.utcnow()

    queue_entry.delete()

    return song.filename


class QueueType(Enum):
    """
    An enum representing the queue state of a song
    """

    NONE = 0
    NORMAL = 1
    USER = 2


class QueueStatus(NamedTuple):
    queued: bool
    type: QueueType
    time: Optional[datetime]


@db_session
def queue_status(song: Song) -> QueueStatus:
    """
    Gets the queue status for a given song

    :param song: song to get status of
    :return: queue details for given song
    """
    song_queue = Queue.select(lambda s: s.song.id == song.id)[:]
    if song_queue:
        song_queue = song_queue[-1]
        req_type = QueueType.USER if song_queue.requested else QueueType.NORMAL
        return QueueStatus(queued=True, type=req_type, time=song_queue.added)
    return QueueStatus(queued=False, type=QueueType.NONE, time=None)


def humanize_lastplayed(seconds: Union[arrow.arrow.Arrow, int]) -> str:
    """
    Converts a given timestamp (or Arrow object) into a human readable, relative form

    :param seconds: timestamp (or Arrow object) to convert
    :return: `seconds` in a human readable, relative form
    """
    if isinstance(seconds, arrow.arrow.Arrow) or seconds > 0:
        if isinstance(seconds, arrow.arrow.Arrow):
            return seconds.humanize()

        return arrow.get(seconds).humanize()
    else:
        return "Never before"


@db_session
def request_status(song: Union[Song, SongData]) -> RequestStatus:
    """
    Gets the requestable status for a given song

    :param song: song to get status of
    :return: requestable status for given song
    """
    status = queue_status(song)
    info = RequestStatus(requestable=not status.queued)

    if count(x for x in Queue) >= 10:
        info.reason = "Queue is full. Please wait until there are less than 10 entries"
        info.requestable = False
    elif status.queued:
        info.reason = "This song is currently queued. It can be requested again 30 minutes after being played"
    elif song.lastplayed:
        lastplayed = arrow.get(song.lastplayed)
        info.humanized_lastplayed = humanize_lastplayed(lastplayed)
        request_allowed = when_requestable(lastplayed.timestamp, song.length)
        if request_allowed > arrow.utcnow():
            info.reason = (
                f"This song can be requested again {request_allowed.humanize()}"
            )
            info.requestable = False
    return info


def when_requestable(lastplayed: int, length: int) -> arrow.arrow.Arrow:
    """
    Calculates when the given song will be requestable again, based on when it was last played.

    :param lastplayed: timestamp of when song was last played
    :param length: length of song
    :return: Arrow object of when song will be requestable
    """
    return arrow.get(lastplayed + (60 * 30) + length)


def parse_status(url: str) -> dict:
    """
    Function to parse the XML returned from a mountpoint.
    Input must be a bytestring as to avoid UnicodeDecodeError from stopping
    Parsing. The only meaningful result is "Current Listeners".

    Logic behind returning an explicit "Online" key is readability
    """
    result = {"Online": False, "Current Song": ""}  # Assume False by default
    try:
        xml = urlopen(url).read()
    except URLError:
        return result

    try:
        # CDATA required
        xml_dict = xmltodict.parse(xml, xml_attribs=False, cdata_separator="\n")

        try:
            xml_dict = (
                xml_dict.get("playlist", {}).get("trackList", {}).get("track", None)
            )
        except AttributeError:
            # No mountpoint it seems, just ditch an empty result
            return result
        else:
            if xml_dict is None:
                # We got none returned from the get anyway
                return result

        annotations = xml_dict.get("annotation", False)
        if not annotations:
            # edge case for having nothing...
            return result
        annotations = annotations.split("\n")
        for annotation in annotations:
            tmp = annotation.split(":", 1)
            if len(tmp) > 1:
                result[tmp[0]] = tmp[1].strip()

        result["Online"] = True
        result["Current Song"] = xml_dict.get("title", "") or ""
    except UnicodeDecodeError:
        # we have runes, but we know we are online. This should not even be
        # possible (requests.get.content)
        result["Online"] = True
        # Erase the bad stuff. However, keep in mind stream title can do this (anything user input...)
        result["Current Song"] = ""

    return result


def filter_default_webargs(args: dict, **kwargs: dict) -> dict:
    """
    Returns a dict containing only arguments that have non-default values set

    :param args: A webargs fields dict
    :param kwargs: The arguments to filter
    :return: dict containing only arguments that have non-default values set
    """
    if isinstance(args, marshmallow.Schema):
        args = args.fields

    res = {}
    for kwarg, val in kwargs.items():
        if kwarg in args:
            webarg = args[kwarg]
            if webarg.default is marshmallow.missing:
                webarg_def = webarg.missing
            else:
                webarg_def = webarg.default

            if val != webarg_def:
                res[kwarg] = val

    return res


def get_nonexistant_path(fname_path):
    """
    Get the path to a filename which does not exist by incrementing path.

    Examples
    --------
    >>> get_nonexistant_path('/etc/issue')
    '/etc/issue-1'
    >>> get_nonexistant_path('whatever/doesnt-exist-yet.py')
    'whatever/doesnt-exist-yet.py'
    """
    if not os.path.exists(fname_path):
        return fname_path
    filename, file_extension = os.path.splitext(fname_path)
    i = 1
    new_fname = "{}-{}{}".format(filename, i, file_extension)
    while os.path.exists(new_fname):
        i += 1
        new_fname = "{}-{}{}".format(filename, i, file_extension)
    return new_fname


def get_self_links(api, obj):
    """Generate `_links._self` for a request"""
    return {"_self": api.url_for(obj, _external=True)}


def add_resource(rest_api, *args, **kwargs):
    def decorator(klass):
        rest_api.add_resource(klass, *args, **kwargs)
        return klass

    return decorator
