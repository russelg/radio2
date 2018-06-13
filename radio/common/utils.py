import math
import os
import shutil
import string
import subprocess
from enum import Enum
from functools import partial
from random import choice, sample, choices
from typing import List, Dict, Optional as _Optional, Union
from urllib.request import urlopen

import arrow
import marshmallow
import mutagen as mutagen
import xmltodict as xmltodict
from flask import jsonify, Response
from munch import Munch

from radio.models import *

register_blueprint_prefixed = partial(
    app.register_blueprint, url_prefix=app.config['SERVER_API_PREFIX'])


class QueueType(Enum):
    """
    An enum representing the queue state of a song
    """
    NONE = 0
    NORMAL = 1
    USER = 2


def make_error(status_code: int, error: Union[str, bool, None], description: str) -> Response:
    """
    Generates a standard error response to use for API responses

    :param status_code: HTTP status code for
    :param error: short name for error
    :param description: full description of error
    :return: a prepared response
    """
    response = jsonify({
        "status_code": status_code,
        "error": error,
        "description": description
    })

    response.status_code = status_code
    return response


def get_folder_metadata(path: str = '.') -> Dict[str, int]:
    """
    Returns a dict containing the number of files in a given folder, and the total size of all files

    :param path: path of folder to get metadata of
    :return: dict containing the number of files in the given folder, and the total size of all files
    """
    total = 0
    count = 0
    # py >= 3.5 only
    for entry in os.scandir(path):
        total += entry.stat().st_size
        count += 1
    return Munch({'files': count, 'size': total})


def get_file_size(path: str) -> int:
    return os.path.getsize(path)


def encode_file(filename: str) -> str:
    """
    Encodes a given file and moves it to the correct output directory

    :param filename: path of file to encode
    :return: full path to encoded file
    """
    folder = app.config["PATH_ENCODE"]
    randomstring = ''.join(choice(string.ascii_letters) for _ in range(16))

    subprocess.call(
        [app.config["PATH_FFMPEG_BINARY"], '-i', filename, '-map_metadata', '0', '-acodec',
         'libvorbis', '-q:a', '6', '-vn', randomstring + '.ogg'],
        cwd=folder)

    full_path = os.path.join(folder, f'{randomstring}.ogg')
    new_path = os.path.join(app.config["PATH_MUSIC"], f'{randomstring}.ogg')
    shutil.move(full_path, new_path)
    print(f'{full_path} => {new_path}')

    # if os.path.isfile(os.path.join(folder, filename)):
    #     os.remove(os.path.join(folder, filename))

    # insert the song to the database
    return new_path


def sample_songs_os(num: int = 5) -> List[str]:
    """
    Samples a selection of songs from the music directory

    :param num: number of songs to sample
    :return: list of sampled songs from music directory
    """
    songs = os.listdir(app.config["PATH_MUSIC"])
    if len(songs) < num:
        return songs

    return sample(songs, num)


@db_session
def sample_songs(num: int = 5) -> List[Song]:
    """
    Samples a selection of songs from the Songs table

    :param num: number of songs to sample
    :return: list of sampled songs from Songs table
    """
    songs = Song.select()[:]
    if len(songs) < num:
        return songs

    return sample(songs, num)


@db_session
def sample_songs_weighted(num: int = 6) -> List[Song]:
    """
    Samples a selection of songs from the Songs table, weighted by playcount.
    This means songs that have been played less have a higher chance of being put in the queue.

    :param num: number of songs to sample
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


def get_metadata(filename: str) -> _Optional[Dict[str, int]]:
    """
    Returns the associated tags for a given music file

    :param filename: file to read tags from
    :return: dict containing music file tags
    """
    metadata = mutagen.File(filename, easy=True)
    if 'title' not in metadata or 'artist' not in metadata:
        os.remove(filename)
        return None
    else:
        title = metadata['title'][0]
        artist = metadata['artist'][0]
        return {
            "title": title,
            "artist": artist,
            "path": filename,
            "length": metadata.info.length
        }


@db_session
def insert_song(filename: str) -> None:
    """
    Adds a song to the database

    :param filename: music file to add
    """
    print("inserting song", filename)
    full_path = os.path.join(app.config["PATH_MUSIC"], filename)
    meta = get_metadata(full_path)
    if meta:
        # check dupe
        song = Song.get(artist=meta['artist'], title=meta['title'])
        if song:
            print(full_path, 'is a dupe, removing...')
            os.remove(full_path)
        else:
            Song(filename=filename, artist=meta['artist'], title=meta['title'], length=int(meta['length']))
            commit()


@db_session
def insert_queue(songs: List[Song]) -> None:
    """
    Adds the given songs to the queue

    :param songs: list of songs to add
    """
    for song in songs:
        Queue(song=song)


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
def generate_queue_simple() -> None:
    """
    Fills the queue with songs, using the weighted sample method
    """
    queue = Queue.select()[:]
    if queue:
        if len(queue) <= 5:
            # fill queue to 5 songs
            to_add = abs(6 - len(queue))
            insert_queue(sample_songs_weighted(to_add))
    else:
        insert_queue(sample_songs_weighted())


@db_session
def reload_songs() -> str:
    """
    Keeps music directory and database in sync.
    This is done by removing songs that exist in the database, but not on the filesystem.
    Also adds any songs found in the filesystem that are not present in the database.
    """
    os_songs = [f for f in os.listdir(app.config["PATH_MUSIC"]) if not f.startswith('.')]
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

    return 'reloaded: added ' + ', '.join(songs_to_add)


@db_session
def next_song() -> str:
    """
    Gets the song to play next from the queue

    :return: path to song
    """
    generate_queue()

    queue_entry = Queue.select().sort_by(Queue.id)[:1][0]
    song = Song[queue_entry.song.id]
    song.playcount += 1
    song.lastplayed = datetime.utcnow()

    queue_entry.delete()

    return song.filename


@db_session
def queue_status(song: Song) -> dict:
    """
    Gets the queue status for a given song

    :param song: song to get status of
    :return: queue details for given song
    """
    song_queue = Queue.select(lambda s: s.song == song)[:]

    if song_queue:
        song_queue = song_queue[-1]
        if song_queue.requested:
            return Munch({
                "queued": True,
                "type": QueueType.USER,
                "time": song_queue.added
            })
        else:
            return Munch({
                "queued": True,
                "type": QueueType.NORMAL,
                "time": song_queue.added
            })

    return Munch({
        "queued": False,
        "type": QueueType.NONE,
        "time": None
    })


def humanize_lastplayed(seconds: Union[arrow.arrow.Arrow, int]) -> str:
    """
    Converts a given timestamp (or Arrow object) into a human readable, relative form

    :param seconds: timestamp (or Arrow object) to convert
    :return: `seconds` in a human readable, relative form
    """
    if isinstance(seconds, arrow.arrow.Arrow) or seconds > 0:
        if isinstance(seconds, arrow.arrow.Arrow):
            return seconds.humanize()
        else:
            return arrow.get(seconds).humanize()
    else:
        return 'Never before'


@db_session
def request_status(song: Song) -> Dict[bool, str]:
    """
    Gets the requestable status for a given song

    :param song: song to get status of
    :return: requestable status for given song
    """
    info = Munch()
    q_status = queue_status(song)
    info.requestable = not q_status.queued
    info.humanized_lastplayed = humanize_lastplayed(0)
    info.reason = None

    if count(x for x in Queue) >= 10:
        info.reason = 'Queue is full, please wait until there are less than 10 entries'
        info.requestable = False
    elif q_status.queued:
        info.reason = 'This song is currently queued and can be requested again 30 minutes after being played'
    elif song.lastplayed:
        lastplayed = arrow.get(song.lastplayed)
        info.humanized_lastplayed = humanize_lastplayed(lastplayed)

        request_allowed = when_requestable(lastplayed.timestamp, song.length)

        if request_allowed > arrow.utcnow():
            info.reason = f'This song can be requested again {request_allowed.humanize()}'
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
    result = {"Online": False}  # Assume False by default
    xml = urlopen(url).read()
    try:
        xml_dict = xmltodict.parse(
            xml,
            xml_attribs=False,
            cdata_separator="\n")  # CDATA required
        try:
            xml_dict = xml_dict.get(
                'playlist',
                {}).get('trackList',
                        {}).get('track',
                                None)
        # No mountpoint it seems, just ditch an empty result
        except AttributeError:
            return result
        else:
            if xml_dict is None:  # We got none returned from the get anyway
                return result
        annotations = xml_dict.get("annotation", False)
        if not annotations:  # edge case for having nothing...
            return result
        annotations = annotations.split("\n")
        for annotation in annotations:
            tmp = annotation.split(":", 1)
            if len(tmp) > 1:
                result[tmp[0]] = tmp[1].strip()  # no need whatsoever to decode anything here. It's not needed by NP()
        result["Online"] = True
        if xml_dict["title"] is None:
            result["Current Song"] = ""  # /shrug
        else:
            result["Current Song"] = xml_dict.get("title", "")
    # we have runes, but we know we are online. This should not even be
    # possible (requests.get.content)
    except UnicodeDecodeError:
        result["Online"] = True
        # Erase the bad stuff. However, keep in mind stream title can do this (anything user input...)
        result["Current Song"] = ""
    except:
        print("Failed to parse XML Status data.")
    # cleaner and easier to read falling back to original function scope
    # (instead of 5 returns)
    return result


def filter_default_webargs(args: dict, **kwargs: dict) -> dict:
    """
    Returns a dict containing only arguments that have non-default values set

    :param args: A webargs fields dict
    :param kwargs: The arguments to filter
    :return: dict containing only arguments that have non-default values set
    """
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


class Pagination(object):
    """
    Helper class to get pagination info
    """

    def __init__(self, page: int, per_page: int, total_count: int):
        """
        :param page: current page
        :param per_page: items per page
        :param total_count: total items
        """
        self.page = page
        self.per_page = per_page
        self.total_count = total_count

    @property
    def pages(self) -> int:
        """
        :returns: total pages
        """
        return max(int(math.ceil(self.total_count / float(self.per_page))), 1)

    @property
    def has_prev(self) -> bool:
        """
        :returns: True if the current page has a previous page, else False
        """
        return self.page > 1

    @property
    def has_next(self) -> bool:
        """
        :returns: True if the current page has a next page, else False
        """
        return self.page < self.pages

    def to_json(self) -> Dict[int, bool]:
        """
        :returns: Pagination info as a dictionary
        """
        return dict(self.__dict__, pages=self.pages, has_prev=self.has_prev, has_next=self.has_next)

    def iter_pages(self, left_edge=2, left_current=2,
                   right_current=5, right_edge=2) -> int:
        """
        :returns: Iterator over all pages, with clipping when too many pages exist
        """
        last = 0
        for num in range(1, self.pages + 1):
            if num <= left_edge or \
                    (self.page - left_current - 1 < num < self.page + right_current) or num > self.pages - right_edge:
                if last + 1 != num:
                    yield None
            yield num
            last = num