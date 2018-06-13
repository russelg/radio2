import os
import pylibshout
import subprocess
import time

import mutagen

from radio.api import app
from radio.common.utils import next_song

transcode: bool = app.config['ICECAST_TRANSCODE'] or False

s = pylibshout.Shout()
print(("Using libshout version %s" % pylibshout.version()))

s.host = app.config['ICECAST_HOST']
s.port = app.config['ICECAST_PORT']
s.user = app.config['ICECAST_USER']
s.password = app.config['ICECAST_PASSWORD']
s.mount = app.config['ICECAST_MOUNT']

if transcode:
    s.format = pylibshout.SHOUT_FORMAT_MP3
else:
    s.format = pylibshout.SHOUT_FORMAT_OGG

s.protocol = pylibshout.SHOUT_PROTOCOL_HTTP

s.name = app.config['ICECAST_NAME']
s.description = app.config['ICECAST_DESCRIPTION']
s.genre = app.config['ICECAST_GENRE']
s.url = app.config['ICECAST_URL']

s.audio_info = {pylibshout.SHOUT_AI_BITRATE: 160}

s.open()

total = 0
fnull = open(os.devnull, "w")
while 1:
    st = time.time()
    fa = os.path.join(app.config['PATH_MUSIC'], next_song())
    print(("opening file %s" % fa))
    f = open(fa, 'rb')

    metadata = mutagen.File(fa, easy=True)
    data = "{} - {}".format(metadata['artist'][0].encode('utf-8'), metadata['title'][0].encode('utf-8'))
    if s.format != pylibshout.SHOUT_FORMAT_OGG:
        s.metadata = {'song': data.encode('utf-8'), 'charset': 'UTF-8'}

    if transcode:
        p = subprocess.Popen(
            [app.config['PATH_FFMPEG_BINARY'], '-i', '-', '-f', 'mp3', '-ab', '160k', '-'],
            stdin=f, stdout=subprocess.PIPE, stderr=fnull, bufsize=0)
        buf = p.stdout.read(4096)
    else:
        buf = f.read(4096)

    total = len(buf)
    while buf:
        s.send(buf)
        if transcode:
            buf = p.stdout.read(4096)
        else:
            buf = f.read(4096)
        total += len(buf)
        s.sync()

    if transcode:
        p.wait()

    f.close()

    et = time.time()
    br = total * 0.008 / (et - st)
    print(("Sent %d bytes in %d seconds (%f kbps)" % (total, et - st, br)))
