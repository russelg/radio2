import base64
import logging
import multiprocessing
import os
import queue
import subprocess
import time
import urllib.parse
import urllib.request
import urllib.response
from http.client import responses
from typing import IO

import shouty
from radio import app, redis_client
from radio.common.utils import get_metadata, next_song

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
        "url": config["ICECAST_URL"],
    }


class Worker(multiprocessing.Process):
    def __init__(
        self, group=None, target=None, name=None, args=(), kwargs=None, *, daemon=None
    ):
        super().__init__(group=group, target=target, name=name, daemon=daemon)
        self.is_mp3 = args[1]
        self.config = args[0]
        self.params = get_shout_params(self.config, self.is_mp3)
        self.format = "MP3" if self.is_mp3 else "OGG"
        self.queue = multiprocessing.JoinableQueue()
        self.pubsub = redis_client.pubsub(ignore_subscribe_messages=True)
        self.pubsub.subscribe("skip")

    def set_metadata(self, song_path: str):
        meta = get_metadata(song_path)
        if meta:
            data = urllib.parse.quote_plus(f"{meta['artist']} - {meta['title']}")
            request = urllib.request.Request(
                "http://{}:{}/admin/metadata?mount={}&mode=updinfo&song={}".format(
                    self.params["host"], self.params["port"], self.params["mount"], data
                )
            )
            base64string = base64.b64encode(
                bytes(f"{self.params['user']}:{self.params['password']}", "ascii")
            )
            request.add_header(
                "Authorization", "Basic %s" % base64string.decode("utf-8")
            )
            with urllib.request.urlopen(request) as resp:
                code = resp.getcode()
                logger.debug(f"Set metadata [{code} {responses[code]}]")

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
            if should_skip == "True":
                logger.debug(f"{self.format}: Redis message: <{message!r}>...")
                return True
        return False

    def stream(self, connection, song_path: str):
        logger.info(f'{self.format}: Streaming "{song_path}"...')
        start_time = time.time()

        if self.is_mp3:
            # set title for mp3 streams
            # ogg is automatically set from file by icecast
            self.set_metadata(song_path)

        with open(song_path, "rb") as song:
            ffmpeg = None
            src: IO = song

            if self.is_mp3:
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
                logger.debug(f"{self.format}: Started ffmpeg.")
                src = ffmpeg.stdout

            chunk_size = 4096
            sent_bytes = 0
            if src:
                while True:
                    # check if we need to skip
                    if self.should_skip():
                        break

                    chunk = src.read(chunk_size)
                    if not chunk:
                        logger.debug(f"{self.format}: Buffer is empty, breaking...")
                        break

                    connection.send(chunk)
                    connection.sync()
                    sent_bytes += len(chunk)
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
        while True:
            with shouty.connect(**self.params) as connection:
                try:
                    song_path = self.queue.get(block=True, timeout=1.0)
                except queue.Empty:
                    continue
                self.stream(connection=connection, song_path=song_path)
                self.queue.task_done()



def run():
    workers = [Worker(args=(app.config, False))]
    if app.config["ICECAST_TRANSCODE"]:
        workers.append(Worker(args=(app.config, True)))

    for worker in workers:
        worker.start()

    while True:
        song = next_song()
        if song is None:
            time.sleep(5)
            logger.warning("No song to play, waiting...")
            continue

        song_path = os.path.join(app.config["PATH_MUSIC"], song)
        logger.info(f'Streaming file "{song_path}"')

        for worker in workers:
            worker.put_queue(song_path)

        for worker in workers:
            worker.join_queue()

        redis_client.publish("skip", "False")
        logger.info("Reset skip flag.")


if __name__ == "__main__":
    run()
