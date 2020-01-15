import sys

# do this to bypass importing __init__.py
# this allows us to generate these config files in a very minimal py env
sys.path.append("radio/")
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
    <hostname>{ICECAST_URL}</hostname>
    <listen-socket>
        <port>{ICECAST_PORT}</port>
    </listen-socket>
    <http-headers>
        <header name="Access-Control-Allow-Origin" value="*"/>
    </http-headers>
    <mount type="normal">
        <mount-name>{ICECAST_MOUNT}.ogg</mount-name>
        <charset>UTF-8</charset>
        <fallback-mount>/fallback.ogg</fallback-mount>
        <fallback-override>1</fallback-override>
        <fallback-when-full>1</fallback-when-full>
    </mount>
"""

if Config.ICECAST_TRANSCODE:
    icecast_xml += """    
    <mount type="normal">
        <mount-name>{ICECAST_MOUNT}.mp3</mount-name>
        <charset>UTF-8</charset>
        <fallback-mount>/fallback.mp3</fallback-mount>
        <fallback-override>1</fallback-override>
        <fallback-when-full>1</fallback-when-full>
    </mount>
"""

icecast_xml += """
    <mount>
        <mount-name>/fallback.mp3</mount-name>
        <dump-file>fallback.mp3</dump-file>
        <burst-size>65536</burst-size>
    </mount>
    <mount>
        <mount-name>/fallback.ogg</mount-name>
        <dump-file>fallback.ogg</dump-file>
        <burst-size>65536</burst-size>
    </mount>
    <fileserve>1</fileserve>
    <paths>
        <basedir>/usr/share/icecast</basedir>
        <logdir>/var/log/icecast</logdir>
        <webroot>/usr/share/icecast/web</webroot>
        <adminroot>/usr/share/icecast/admin</adminroot>
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
        <changeowner>
            <user>icecast</user>
            <group>icecast</group>
        </changeowner>
    </security>
</icecast>"""

env = """ICECAST_SOURCE_PASSWORD={ICECAST_PASSWORD}
ICECAST_ADMIN_PASSWORD={ICECAST_PASSWORD}
ICECAST_RELAY_PASSWORD={ICECAST_PASSWORD}
POSTGRES_PASSWORD={DB_PASSWORD}
POSTGRES_USER={DB_USER}
POSTGRES_DB={DB_DATABASE}"""

with open("icecast.xml", "w") as f:
    config = {**Config.__dict__}
    config['ICECAST_URL'] = config['ICECAST_URL'].split('://')[-1]
    f.write(icecast_xml.format(**config))
    print("wrote icecast.xml with values from radio/config.py")

with open("icecast.env", "w") as f:
    f.write(env.format(**Config.__dict__))
    print("wrote icecast.env with values from radio/config.py")
