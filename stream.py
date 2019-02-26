import io
import os
import subprocess
import threading
import time
from collections import namedtuple
from typing import List, NamedTuple

import mutagen

from radio.pylibshout import pylibshout
from radio.api import app
from radio.common.utils import get_metadata, next_song


class ShoutInstance(NamedTuple):
    shout: pylibshout.Shout
    src: io.BufferedReader

    def reset(self):
        new = initialize_shout(
            app.config, self.shout.format == pylibshout.SHOUT_FORMAT_MP3)
        return self._replace(shout=new.shout, src=self.src)


shout_instances: List[ShoutInstance] = []


def initialize_shout(config, mp3) -> ShoutInstance:
    shout = pylibshout.Shout()

    # Stream connection settings
    shout.protocol = pylibshout.SHOUT_PROTOCOL_HTTP
    shout.host = config['ICECAST_HOST']
    shout.port = config['ICECAST_PORT']
    shout.user = config['ICECAST_USER']
    shout.password = config['ICECAST_PASSWORD']
    shout.mount = config['ICECAST_MOUNT'] + ('.mp3' if mp3 else '.ogg')
    shout.format = pylibshout.SHOUT_FORMAT_MP3 if mp3 else pylibshout.SHOUT_FORMAT_OGG
    if mp3:
        shout.audio_info = {
            pylibshout.SHOUT_AI_BITRATE: config['TRANSCODE_BITRATE']}

    # Stream metadata
    shout.name = config['ICECAST_NAME']
    shout.description = config['ICECAST_DESCRIPTION']
    shout.genre = config['ICECAST_GENRE']
    shout.url = config['ICECAST_URL']

    return ShoutInstance(shout, None)


class Worker(threading.Thread):
    def __init__(self, group=None, target=None, name=None,
                 args=(), kwargs=None, *, daemon=None):
        super().__init__(group=group, target=target, name=name,
                         daemon=daemon)
        self.args = args
        self.kwargs = kwargs

        self.instance = args[0]
        self.song_path = args[1]

    def run(self):
        song_path = self.song_path
        start_time = time.time()

        meta = get_metadata(song_path)
        data = meta['artist'] + ' - ' + meta["title"]

        ffmpeg = None
        song = open(song_path, 'rb')
        self.instance = self.instance._replace(src=song)
        if self.instance.shout.format == pylibshout.SHOUT_FORMAT_MP3:
            self.instance.shout.metadata = {'song': data.encode('utf-8')}
            ffmpeg = subprocess.Popen([app.config['PATH_FFMPEG_BINARY'], '-i', '-', '-f', 'mp3',
                                       '-ab', f'{app.config["TRANSCODE_BITRATE"]}k', '-'],
                                      stdin=song, stdout=subprocess.PIPE, stderr=devnull)
            self.instance = self.instance._replace(src=ffmpeg.stdout)

        bytes_sent = 0
        if self.instance.src:
            buffer = self.instance.src.read(4096)
            bytes_sent = len(buffer)
            while buffer:
                bytes_sent += len(buffer)
                self.instance.shout.send(buffer)
                self.instance.shout.sync()

                buffer = self.instance.src.read(512)

        if ffmpeg:
            ffmpeg.wait()

        song.close()

        finish_time = time.time()
        kbps = bytes_sent * 0.008 / (finish_time - start_time)
        stream_format = 'MP3' if self.instance.shout.format == pylibshout.SHOUT_FORMAT_MP3 else 'OGG'
        app.logger.info(
            f"[{stream_format}] Sent {bytes_sent} bytes in {int(finish_time - start_time)} seconds ({int(kbps)} kbps)")


shout_instances.append(initialize_shout(app.config, False))
if app.config['ICECAST_TRANSCODE']:
    shout_instances.append(initialize_shout(app.config, True))


for idx, instance in enumerate(shout_instances):
    while True:
        try:
            instance.shout.open()
            break
        except pylibshout.ShoutException as e:
            app.logger.warning('Could not open instance, retrying...')
            time.sleep(3)
            shout_instances[idx] = instance.reset()
            continue

bytes_sent = 0
devnull = open(os.devnull, "w")
while True:
    jobs = []
    song_path = os.path.join(app.config['PATH_MUSIC'], next_song())
    app.logger.info(f'streaming file "{song_path}"')
    for instance in shout_instances:
        worker = Worker(args=(instance, song_path))
        jobs.append(worker)
        worker.start()

    for job in jobs:
        job.join()
