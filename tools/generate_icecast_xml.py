import os
import sys

# do this to bypass importing __init__.py
# this allows us to generate these config files in a very minimal py env
sys.path.append('radio/')

from config import Config


icecast_xml = """
<icecast>
    <location>{ICECAST_LOCATION}</location>
    <admin>{ICECAST_CONTACT}</admin>
    <limits>
        <clients>2048</clients>
        <sources>5</sources>
        <queue-size>524288</queue-size>
        <client-timeout>5</client-timeout>
        <header-timeout>5</header-timeout>
        <source-timeout>5</source-timeout>
        <burst-on-connect>1</burst-on-connect>
        <burst-size>65535</burst-size>
    </limits>
    <authentication>
        <source-password>{ICECAST_PASSWORD}</source-password>
        <relay-password>{ICECAST_PASSWORD}</relay-password>
        <admin-user>{ICECAST_USER}</admin-user>
        <admin-password>{ICECAST_PASSWORD}</admin-password>
    </authentication>
    <hostname>{SERVER_NAME}</hostname>
    <listen-socket>
        <port>{ICECAST_PORT}</port>
    </listen-socket>
    <http-headers>
        <header name="Access-Control-Allow-Origin" value="*"/>
    </http-headers>
    <mount type="normal">
        <mount-name>{ICECAST_MOUNT}.ogg</mount-name>
        <charset>UTF-8</charset>
    </mount>
"""

if Config.ICECAST_TRANSCODE:
    icecast_xml += """    <mount type="normal">
        <mount-name>{ICECAST_MOUNT}.mp3</mount-name>
        <charset>UTF-8</charset>
    </mount>"""

icecast_xml += """
    <fileserve>1</fileserve>
    <paths>
        <!-- <basedir>/usr/local/share/icecast</basedir>
        <logdir>/var/log/icecast</logdir>
        <webroot>/usr/local/share/icecast/web</webroot>
        <adminroot>/usr/local/share/icecast/admin</adminroot> -->
        <basedir>/usr/share/icecast2</basedir>
        <logdir>/var/log/icecast2</logdir>
        <webroot>/usr/share/icecast2/web</webroot>
        <adminroot>/usr/share/icecast2/admin</adminroot>
        <alias source="/" destination="/status.xsl"/>
    </paths>
    <logging>
        <accesslog>access.log</accesslog>
        <errorlog>error.log</errorlog>
        <loglevel>3</loglevel>
        <logsize>10000</logsize>
    </logging>
    <security>
        <chroot>0</chroot>
    </security>
</icecast>
"""

env = """
ICECAST_SOURCE_PASSWORD={ICECAST_PASSWORD}
ICECAST_ADMIN_PASSWORD={ICECAST_PASSWORD}
ICECAST_RELAY_PASSWORD={ICECAST_PASSWORD}
POSTGRES_PASSWORD={DB_PASSWORD}
POSTGRES_USER={DB_USER}
POSTGRES_DB={DB_DATABASE}
"""

with open('icecast.xml', 'w') as f:
    f.write(icecast_xml.format(**Config.__dict__))
    print('wrote icecast.xml with values from radio/config.py')

with open('icecast.env', 'w') as f:
    f.write(env.format(**Config.__dict__))
    print('wrote icecast.env with values from radio/config.py')
