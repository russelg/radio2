import io
import logging
import os
import subprocess
import multiprocessing
import time
from dataclasses import dataclass
from typing import List

from radio.api import app
from radio.common.utils import get_metadata, next_song

# try import pylibshout from env first
try:
    import pylibshout
except ImportError:
    from radio.pylibshout import pylibshout

app.logger.setLevel(logging.INFO)


@dataclass
class ShoutInstance:
    shout: pylibshout.Shout
    src: io.BufferedReader

    @property
    def format(self) -> str:
        return "MP3" if self.is_mp3 else "OGG"

    @property
    def is_mp3(self) -> bool:
        return self.shout.format == pylibshout.SHOUT_FORMAT_MP3

    def connect(self):
        try:
            self.shout.open()
            app.logger.info(
                "%s: Connected to Icecast on %s", self.format, self.shout.mount
            )
        except pylibshout.ShoutException as e:
            app.logger.error("Failed to connect to Icecast server. (%s)", e)

    def disconnect(self):
        try:
            self.shout.close()
            app.logger.info(
                "%s: Disconnected from Icecast on %s", self.format, self.shout.mount
            )
        except pylibshout.ShoutException:
            pass

    @property
    def connected(self) -> bool:
        try:
            return self.shout.connected() == -7
        except AttributeError:
            return False

    def reset(self):
        self.disconnect()
        inst = ShoutInstance.initialize(app.config, self.is_mp3)
        self.shout = inst.shout
        self.connect()

    @staticmethod
    def initialize(config, mp3):
        shout = pylibshout.Shout(tag_fix=False)

        # Stream connection settings
        shout.protocol = pylibshout.SHOUT_PROTOCOL_HTTP
        shout.host = config["ICECAST_HOST"]
        shout.port = config["ICECAST_PORT"]
        shout.user = config["ICECAST_USER"]
        shout.password = config["ICECAST_PASSWORD"]
        shout.mount = config["ICECAST_MOUNT"] + (".mp3" if mp3 else ".ogg")
        shout.format = (
            pylibshout.SHOUT_FORMAT_MP3 if mp3 else pylibshout.SHOUT_FORMAT_OGG
        )
        if mp3:
            shout.audio_info = {
                pylibshout.SHOUT_AI_BITRATE: config["TRANSCODE_BITRATE"]
            }

        # Stream metadata
        shout.name = config["ICECAST_NAME"]
        shout.description = config["ICECAST_DESCRIPTION"]
        shout.genre = config["ICECAST_GENRE"]
        shout.url = config["ICECAST_URL"]

        return ShoutInstance(shout, None)


class Worker(multiprocessing.Process):
    def __init__(
        self, group=None, target=None, name=None, args=(), kwargs=None, *, daemon=None
    ):
        super().__init__(group=group, target=target, name=name, daemon=daemon)
        self.args = args
        self.kwargs = kwargs

        self.instance = args[0]
        self.song_path = args[1]

    def run(self):
        # reset this instance for a clean slate?
        # self.instance.reset()

        song_path = self.song_path
        start_time = time.time()

        meta = get_metadata(song_path)
        data = meta["artist"] + " - " + meta["title"]

        ffmpeg = None
        song = open(song_path, "rb")
        devnull = open(os.devnull, "w")

        self.instance.src = song
        if self.instance.is_mp3:
            self.instance.shout.metadata = {"song": data.encode("utf-8")}
            ffmpeg = subprocess.Popen(
                [
                    app.config["PATH_FFMPEG_BINARY"],
                    "-i",
                    "-",
                    "-f",
                    "mp3",
                    "-ab",
                    f'{app.config["TRANSCODE_BITRATE"]}k',
                    "-",
                ],
                stdin=song,
                stdout=subprocess.PIPE,
                stderr=devnull,
            )
            self.instance.src = ffmpeg.stdout

        sent_bytes = 0
        if self.instance.src:
            buffer = self.instance.src.read(4096)
            while buffer:
                while True:
                    try:
                        self.instance.shout.send(buffer)
                        sent_bytes += len(buffer)
                        self.instance.shout.sync()
                        break
                    except pylibshout.ShoutException:
                        app.logger.warning(
                            "%s: stream died, resetting shout instance...",
                            self.instance.format,
                        )
                        self.instance.reset()
                        time.sleep(3)
                        continue

                buffer = self.instance.src.read(1024)

        if ffmpeg:
            ffmpeg.wait()

        song.close()

        finish_time = time.time()
        kbps = int(sent_bytes * 0.008 / (finish_time - start_time))
        duration = int(finish_time - start_time)
        app.logger.info(
            f"{self.instance.format}: Sent {sent_bytes} bytes in {duration} seconds ({kbps} kbps)"
        )


def run():
    shout_instances: List[ShoutInstance] = []
    shout_instances.append(ShoutInstance.initialize(app.config, False))
    if app.config["ICECAST_TRANSCODE"]:
        shout_instances.append(ShoutInstance.initialize(app.config, True))

    for instance in shout_instances:
        instance.connect()

    while True:
        jobs = []
        nxt_song = next_song()
        if nxt_song is None:
            time.sleep(10)
            app.logger.warning("No song to play, waiting...")
            continue

        song = os.path.join(app.config["PATH_MUSIC"], nxt_song)
        app.logger.info(f'streaming file "{song}"')
        for instance in shout_instances:
            worker = Worker(args=(instance, song))
            jobs.append(worker)
            worker.start()

        for job in jobs:
            job.join()


if __name__ == "__main__":
    run()
