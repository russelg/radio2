import base64
import logging
import multiprocessing
import os
import subprocess
import time
import urllib.parse
import urllib.request
import urllib.response
from http.client import responses


from typing import IO

import shouty

from radio import app, redis_client
from radio.common.utils import next_song, get_metadata

logging.basicConfig(
    level=logging.NOTSET,
    format="%(asctime)s - %(name)s:%(process)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("stream")


def get_shout_params(config: dict, mp3: bool) -> dict:
    audio_info = {"channels": "2"}
    if mp3:
        audio_info["bitrate"] = f"{config['TRANSCODE_BITRATE'] * 1000}"

    return {
        "host": config["ICECAST_HOST"],
        "port": config["ICECAST_PORT"],
        "user": config["ICECAST_USER"],
        "password": config["ICECAST_PASSWORD"],
        "format": shouty.Format.MP3 if mp3 else shouty.Format.OGG,
        "mount": config["ICECAST_MOUNT"] + (".mp3" if mp3 else ".ogg"),
        "audio_info": audio_info,
        "name": config["ICECAST_NAME"],
        "description": config["ICECAST_DESCRIPTION"],
        "genre": config["ICECAST_GENRE"],
        "url": config["ICECAST_URL"]
    }


def set_metadata(config: dict, song_path: str):
    meta = get_metadata(song_path)
    if meta:
        data = urllib.parse.quote_plus(f"{meta['artist']} - {meta['title']}")
        request = urllib.request.Request(
            "http://{}:{}/admin/metadata?mount={}&mode=updinfo&song={}".format(config["host"], config["port"],
                                                                               config["mount"], data))
        base64string = base64.b64encode(bytes(f"{config['user']}:{config['password']}", 'ascii'))
        request.add_header("Authorization", "Basic %s" % base64string.decode('utf-8'))
        with urllib.request.urlopen(request) as resp:
            code = resp.getcode()
            logger.debug(f"Set metadata [{code} {responses[code]}]")


class Worker(multiprocessing.Process):
    def __init__(
        self, group=None, target=None, name=None, args=(), kwargs=None, *, daemon=None
    ):
        super().__init__(group=group, target=target, name=name, daemon=daemon)
        self.is_mp3 = args[1]
        self.config = args[0]
        self.params = get_shout_params(self.config, self.is_mp3)
        self.format = 'MP3' if self.is_mp3 else 'OGG'
        self.queue = multiprocessing.JoinableQueue()
        self.pubsub = redis_client.pubsub(ignore_subscribe_messages=True)
        self.pubsub.subscribe("skip")

    def put_queue(self, song_path: str):
        self.queue.put(song_path)

    def join_queue(self):
        self.queue.join()

    def should_skip(self):
        message = self.pubsub.get_message()
        if message:
            # parse skip message to see if we should skip or not
            # "False" == do not skip, anything else will skip.
            should_skip = message.get("data", "False").decode()
            if should_skip != "False":
                logger.debug(f"{self.format}: Redis message: <{message!r}>...")
                return True
        return False

    def stream(self, connection, song_path: str):
        logger.info(f'{self.format}: Streaming "{song_path}"...')
        start_time = time.time()

        with open(song_path, "rb") as song:
            ffmpeg = None
            src: IO = song

            if self.is_mp3:
                ffmpeg = subprocess.Popen(
                    [
                        self.config["PATH_FFMPEG_BINARY"],
                        "-i", "-",
                        "-f", "mp3",
                        "-ab", f'{self.config["TRANSCODE_BITRATE"]}k',
                        "-",
                    ],
                    stdin=song,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                )
                logger.debug(f"{self.format}: Started ffmpeg.")
                src = ffmpeg.stdout

            chunk_size = 4096
            sent_bytes = 0
            if src:
                while True:
                    # check for any redis skip messages
                    message = self.pubsub.get_message()
                    if message:
                        # parse skip message to see if we should skip or not
                        # "False" == do not skip, anything else will skip.
                        should_skip = message.get("data", "False").decode()
                        if should_skip != "False":
                            logger.debug(f"{self.format}: Redis message: <{message!r}>...")
                            break

                    chunk = src.read(chunk_size)
                    if not chunk:
                        logger.debug(f"{self.format}: Buffer is empty, breaking...")
                        break

                    buf_size = len(chunk)
                    sent_bytes += buf_size

                    connection.send(chunk)
                    connection.sync()
                src.close()

            if ffmpeg:
                ffmpeg.terminate()
                logger.debug(f"{self.format}: Stopped ffmpeg.")

        finish_time = time.time()
        kbps = int(sent_bytes * 0.008 / (finish_time - start_time))
        duration = int(finish_time - start_time)
        logger.info(
            f"{self.format}: Sent {sent_bytes} bytes in {duration} seconds ({kbps} kbps)"
        )

    def run(self):
        with shouty.connect(**self.params) as connection:
            while True:
                song_path = self.queue.get(block=True)
                if song_path is None:
                    break
                if self.is_mp3:
                    set_metadata(self.params, song_path)
                self.stream(connection=connection, song_path=song_path)
                self.queue.task_done()


def run():
    workers = [Worker(args=(app.config, False))]
    if app.config["ICECAST_TRANSCODE"]:
        workers.append(Worker(args=(app.config, True)))

    for worker in workers:
        worker.daemon = True
        worker.start()

    while True:
        nxt_song = next_song()
        if nxt_song is None:
            time.sleep(5)
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
