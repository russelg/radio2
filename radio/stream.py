import io
import logging
import multiprocessing
import os
import subprocess
import time
from typing import IO, List

from radio.api import app
from radio.common.utils import get_metadata, next_song

# try import pylibshout from env first
try:
    import pylibshout  # type: ignore
except ImportError:
    from radio import pylibshout

logging.basicConfig(
    level=logging.NOTSET,
    format="%(asctime)s - %(name)s:%(process)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("stream")


class ShoutInstance:
    def __init__(self, config: dict, mp3: bool):
        self.config = config
        self.mp3 = mp3
        self.shout = self.initialize_libshout(config, mp3)

    @property
    def format(self) -> str:
        return "MP3" if self.is_mp3 else "OGG"

    @property
    def is_mp3(self) -> bool:
        return self.shout.format == pylibshout.SHOUT_FORMAT_MP3

    def connect(self):
        try:
            self.shout.open()
            logger.info("%s: Connected to Icecast on %s", self.format, self.shout.mount)
        except pylibshout.ShoutException as e:
            logger.error("Failed to connect to Icecast server. (%s)", e)

    def disconnect(self):
        try:
            self.shout.close()
            logger.info(
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
        self.__init__(self.config, self.is_mp3)
        self.connect()

    @staticmethod
    def initialize_libshout(config: dict, mp3: bool) -> pylibshout.Shout:
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

        return shout


class Worker(multiprocessing.Process):
    def __init__(
        self, group=None, target=None, name=None, args=(), kwargs=None, *, daemon=None
    ):
        super().__init__(group=group, target=target, name=name, daemon=daemon)
        self.args = args
        self.kwargs = kwargs

        self.queue = multiprocessing.JoinableQueue()
        self.config = args[0]
        self.is_mp3 = args[1]

        self.instance = ShoutInstance(self.config, self.is_mp3)

    def put_queue(self, song_path: str):
        self.queue.put(song_path)

    def join_queue(self):
        self.queue.join()

    def stream(self, song_path: str):
        start_time = time.time()
        meta = get_metadata(song_path)
        data = ""
        if meta:
            data = f"{meta['artist']} - {meta['title']}"

        ffmpeg = None
        song = open(song_path, "rb")
        devnull = open(os.devnull, "w")

        src: IO = song

        # pass ogg thru ffmpeg if mp3 wanted
        if self.instance.is_mp3:
            self.instance.shout.metadata = {"song": data.encode("utf-8")}
            ffmpeg = subprocess.Popen(
                [
                    self.config["PATH_FFMPEG_BINARY"],
                    "-i",
                    "-",
                    "-f",
                    "mp3",
                    "-ab",
                    f'{self.config["TRANSCODE_BITRATE"]}k',
                    "-",
                ],
                stdin=song,
                stdout=subprocess.PIPE,
                stderr=devnull,
            )
            src = ffmpeg.stdout

        sent_bytes = 0
        retries = 0
        if src:
            buffer = src.read(4096)
            while buffer:
                while retries < 3:
                    try:
                        self.instance.shout.send(buffer)
                        sent_bytes += len(buffer)
                        self.instance.shout.sync()
                        break
                    except pylibshout.ShoutException:
                        # keep trying to connect to
                        logger.warning(
                            "%s: stream died, resetting shout instance...",
                            self.instance.format,
                        )
                        self.instance.reset()
                        time.sleep(1)
                        retries += 1
                        continue
                buffer = src.read(1024)

        if ffmpeg:
            ffmpeg.wait()

        song.close()

        finish_time = time.time()
        kbps = int(sent_bytes * 0.008 / (finish_time - start_time))
        duration = int(finish_time - start_time)
        logger.info(
            f"{self.instance.format}: Sent {sent_bytes} bytes in {duration} seconds ({kbps} kbps)"
        )

    def run(self):
        self.instance.connect()
        while True:
            song_path = self.queue.get(block=True)
            logger.info(f'{self.instance.format}: Got new file "{song_path}"')
            if song_path is None:
                break
            self.stream(song_path)
            self.queue.task_done()


def run():
    workers: List[Worker] = []
    workers.append(Worker(args=(app.config, False)))
    if app.config["ICECAST_TRANSCODE"]:
        workers.append(Worker(args=(app.config, True)))

    for worker in workers:
        worker.daemon = True
        worker.start()

    while True:
        nxt_song = next_song()
        if nxt_song is None:
            time.sleep(10)
            logger.warning("No song to play, waiting...")
            continue

        song = os.path.join(app.config["PATH_MUSIC"], nxt_song)
        logger.info(f'streaming file "{song}"')
        for worker in workers:
            worker.put_queue(song)

        for worker in workers:
            worker.join_queue()


if __name__ == "__main__":
    run()
