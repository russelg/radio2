class Config:
    """ Server configuration """

    # Print/display debug info while running
    DEBUG = False
    PROPAGATE_EXCEPTIONS = False

    # Protocol to prefer for URLs (http/s)
    PREFERRED_URL_SCHEME = "http"
    # Prefix to use for API URLs
    SERVER_API_PREFIX = "/api/v1"
    # Replace with a long, random string
    SECRET_KEY = "secret-key-goes-here"
    # Replace with a long, random string
    JWT_SECRET_KEY = "secret-key-goes-here"

    # Desired vorbis quality level for encoding uploaded files
    SONG_QUALITY_LVL = 8
    # Desired bitrate to use for streaming (transcoding)
    TRANSCODE_BITRATE = 192

    # Paths (prefer full paths, relative cannot be guaranteed)
    # Path to store all songs at
    PATH_MUSIC = "/full/path/to/radio/music/"
    # Path to store temporary files for encoding
    PATH_ENCODE = "/full/path/to/radio/encode/"
    # Path to an ffmpeg binary to use for encoding (this MUST exist)
    PATH_FFMPEG_BINARY = "/usr/local/bin/ffmpeg"
    # Allowed music upload extensions
    ALLOWED_EXTENSIONS = ["mp3", "ogg", "flac", "wav", "m4a"]

    # Database configuration for PonyORM (postgres preferred)
    DB_BINDING = "postgres"
    DB_HOST = "127.0.0.1"
    DB_USER = "sgfc"
    DB_PASSWORD = ""
    DB_DATABASE = "radio"

    # Icecast server configuration
    # Icecast auth
    ICECAST_HOST = "127.0.0.1"
    ICECAST_PORT = 8067
    ICECAST_USER = "source"
    ICECAST_PASSWORD = "source-password-goes-here"
    # Icecast metadata
    ICECAST_LOCATION = "Country"
    ICECAST_CONTACT = "contact.email@example.com"
    ICECAST_MOUNT = "/radio"
    ICECAST_NAME = "Radio Stream Title"
    ICECAST_DESCRIPTION = "A short description about your stream"
    ICECAST_GENRE = "Genre of the music being streamed"
    ICECAST_URL = "http://url-to-use-for-icecast-links.org"
    # Transcode stream to MP3 for browser compatibility
    ICECAST_TRANSCODE = False

    # Redis configuration
    # Used to enable song skipping, among other things
    REDIS_URL = "redis://redis:6379/0"

    # OpenID auth configuration
    # Allows use of OpenID login (as well as traditional)
    AUTH_OPENID_ENABLED = True
    AUTH_CLIENT_ID = "client-id"
    AUTH_CLIENT_SECRET = "client-secret"
    AUTH_SERVER_METADATA_URL = "https://example.com/.well-known/openid-configuration"

    # General app configuration
    # Largest allowed size for music uploads, in bytes (if PUBLIC_UPLOADS is True)
    FILE_SIZE_LIMIT = 524288000
    # Allow anyone to upload (only logged-in admins otherwise)
    PUBLIC_UPLOADS = False
    # Displays a download button next to songs in the song listing
    PUBLIC_DOWNLOADS = False
    # Title of the site to show in headings and the browser title
    TITLE = "SGFC Radio"
    # Number of songs to return per page
    SONGS_PER_PAGE = 25

    # CSS options for website
    # These must be for Bootstrap 4
    DEFAULT_CSS = "Pulse"
    CSS = {
        "Cerulean": "https://bootswatch.com/4/cerulean/bootstrap.min.css",
        "Cosmo": "https://bootswatch.com/4/cosmo/bootstrap.min.css",
        "Cyborg": "https://bootswatch.com/4/cyborg/bootstrap.min.css",
        "Darkly": "https://bootswatch.com/4/darkly/bootstrap.min.css",
        "Flatly": "https://bootswatch.com/4/flatly/bootstrap.min.css",
        "Journal": "https://bootswatch.com/4/journal/bootstrap.min.css",
        "Litera": "https://bootswatch.com/4/litera/bootstrap.min.css",
        "Lumen": "https://bootswatch.com/4/lumen/bootstrap.min.css",
        "Lux": "https://bootswatch.com/4/lux/bootstrap.min.css",
        "Materia": "https://bootswatch.com/4/materia/bootstrap.min.css",
        "Minty": "https://bootswatch.com/4/minty/bootstrap.min.css",
        "Pulse": "https://bootswatch.com/4/pulse/bootstrap.min.css",
        "Sandstone": "https://bootswatch.com/4/sandstone/bootstrap.min.css",
        "Simplex": "https://bootswatch.com/4/simplex/bootstrap.min.css",
        "Sketchy": "https://bootswatch.com/4/sketchy/bootstrap.min.css",
        "Slate": "https://bootswatch.com/4/slate/bootstrap.min.css",
        "Solar": "https://bootswatch.com/4/solar/bootstrap.min.css",
        "Spacelab": "https://bootswatch.com/4/spacelab/bootstrap.min.css",
        "Superhero": "https://bootswatch.com/4/superhero/bootstrap.min.css",
        "United": "https://bootswatch.com/4/united/bootstrap.min.css",
        "Yeti": "https://bootswatch.com/4/yeti/bootstrap.min.css",
    }
