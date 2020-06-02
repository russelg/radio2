import json
import sys

# do this to bypass importing __init__.py
# this allows us to generate these config files in a very minimal py env
sys.path.append("radio/")
from config import Config

icecast_xml = f"""
<icecast>
    <location>{Config.ICECAST_LOCATION}</location>
    <admin>{Config.ICECAST_CONTACT}</admin>
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
        <source-password>{Config.ICECAST_PASSWORD}</source-password>
        <relay-password>{Config.ICECAST_PASSWORD}</relay-password>
        <admin-user>{Config.ICECAST_USER}</admin-user>
        <admin-password>{Config.ICECAST_PASSWORD}</admin-password>
    </authentication>
    <hostname>{Config.ICECAST_URL.split("://")[-1]}</hostname>
    <listen-socket>
        <port>{Config.ICECAST_PORT}</port>
    </listen-socket>
    <http-headers>
        <header name="Access-Control-Allow-Origin" value="*"/>
    </http-headers>
    <mount type="normal">
        <mount-name>{Config.ICECAST_MOUNT}.ogg</mount-name>
        <charset>UTF-8</charset>
        <fallback-mount>/fallback.ogg</fallback-mount>
        <fallback-override>1</fallback-override>
        <fallback-when-full>1</fallback-when-full>
    </mount>
"""

if Config.ICECAST_TRANSCODE:
    icecast_xml += f"""    
    <mount type="normal">
        <mount-name>{Config.ICECAST_MOUNT}.mp3</mount-name>
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

env = f"""POSTGRES_PASSWORD={Config.DB_PASSWORD}
POSTGRES_USER={Config.DB_USER}
POSTGRES_DB={Config.DB_DATABASE}"""

react_env = f"""REACT_APP_CSS={Config.CSS[Config.DEFAULT_CSS]}
REACT_APP_STYLES={json.dumps(Config.CSS)}
REACT_APP_ICECAST={json.dumps({"mount": Config.ICECAST_MOUNT, "url": Config.ICECAST_URL})}
REACT_APP_TITLE={Config.TITLE}
REACT_APP_DOWNLOADS_ENABLED={'true' if Config.PUBLIC_DOWNLOADS else 'false'}
REACT_APP_UPLOADS_ENABLED={'true' if Config.PUBLIC_UPLOADS else 'false'}"""


def write(filename, data):
    with open(filename, "w") as f:
        f.write(data)
        print(f"wrote {filename}")


write("icecast.xml", icecast_xml)
write("database.env", env)
write("frontend/.env", react_env)
