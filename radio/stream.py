import logging
import multiprocessing
import os
import subprocess
import time
from typing import IO, List

# import redis
from radio import app, redis_client
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
            shout.audio_info = {"bitrate": f"{config['TRANSCODE_BITRATE'] * 1000}"}

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
        self.config = args[0]
        self.is_mp3 = args[1]
        self.queue = multiprocessing.JoinableQueue()
        self.instance = ShoutInstance(self.config, self.is_mp3)
        self.pubsub = redis_client.pubsub(ignore_subscribe_messages=True)
        self.pubsub.subscribe("skip")

    def put_queue(self, song_path: str):
        self.queue.put(song_path)

    def join_queue(self):
        self.queue.join()

    def stream(self, song_path: str):
        logger.info(f'{self.instance.format}: Streaming "{song_path}"...')
        start_time = time.time()
        meta = get_metadata(song_path)
        data = ""
        if meta:
            data = f"{meta['artist']} - {meta['title']}"

        ffmpeg = None
        song = open(song_path, "rb")
        src: IO = song

        # pass ogg thru ffmpeg if mp3 wanted
        if self.instance.is_mp3:
            self.instance.shout.metadata = {"song": data.encode("utf-8")}
            logger.info(
                f"{self.instance.format}: Setting metadata: {self.instance.shout.metadata}..."
            )
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
                stderr=subprocess.DEVNULL,
            )
            logger.debug(f"{self.instance.format}: Started ffmpeg.")
            src = ffmpeg.stdout

        chunk_size = 4096
        sent_bytes = 0
        if src:
            while True:
                buffer = src.read(chunk_size)
                buf_size = len(buffer)
                sent_bytes += buf_size

                # check for any redis skip messages
                message = self.pubsub.get_message()
                should_skip = "False"
                if message:
                    # parse skip message to see if we should skip or not
                    # "False" == do not skip, anything else will skip.
                    should_skip = message.get("data", "False").decode()

                if buffer and should_skip == "False":
                    ret = self.instance.shout.send(buffer)
                    if ret < 0:
                        logger.error(f"{self.instance.format}: csend: <{ret}>")
                        break
                else:
                    logger.debug(
                        f"{self.instance.format}: Redis message: <{message!r}>..."
                    )
                    logger.debug(
                        f"{self.instance.format}: Buffer is empty, breaking..."
                    )
                    break
                self.instance.shout.sync()

        if ffmpeg:
            ffmpeg.terminate()
            logger.debug(f"{self.instance.format}: Stopped ffmpeg.")

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
            if song_path is None:
                break
            self.stream(song_path)
            self.queue.task_done()
            self.instance.reset()


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
        logger.info(f'Streaming file "{song}"')
        for worker in workers:
            worker.put_queue(song)

        for worker in workers:
            worker.join_queue()

        redis_client.publish("skip", "False")
        logger.info(f"Reset skip flag.")


if __name__ == "__main__":
    run()
