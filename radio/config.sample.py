class Config(object):
    # Server configuration
    DEBUG = False  # Print/display debug info while running
    SERVER_NAME = 'localhost:5000'  # URL the site is running at
    PREFERRED_URL_SCHEME = 'http'  # Protocol to prefer for URLs (http/s)
    SERVER_API_PREFIX = '/api/v1'  # Prefix to use for API URLs
    SECRET_KEY = 'secret-key-goes-here'  # Replace with a long, random string
    JWT_SECRET_KEY = 'secret-key-goes-here'  # Replace with a long, random string
    SERVER_USE_XACCEL = False  # Use nginx's xaccel to serve music files for download

    # Paths (prefer full paths, relative cannot be guaranteed)
    PATH_MUSIC = '/full/path/to/radio/music/'  # Path to store all songs at
    PATH_ENCODE = '/full/path/to/radio/encode/'  # Path to store temporary files for encoding
    PATH_FFMPEG_BINARY = '/usr/local/bin/ffmpeg'  # Path to an ffmpeg binary to use for encoding (this MUST exist)

    # Database configuration for PonyORM (postgres preferred)
    DB_BINDING = 'postgres'
    DB_HOST = '127.0.0.1'
    DB_USER = 'sgfc'
    DB_PASSWORD = ''
    DB_DATABASE = 'radio'

    # Icecast server configuration
    # Icecast auth
    ICECAST_HOST = 'localhost'
    ICECAST_PORT = 8067
    ICECAST_USER = 'source'
    ICECAST_PASSWORD = 'source-password-goes-here'
    # Icecast metadata
    ICECAST_LOCATION = 'Country'
    ICECAST_CONTACT = 'contact.email@example.com'
    ICECAST_MOUNT = '/radio'
    ICECAST_NAME = 'Radio Stream Title'
    ICECAST_DESCRIPTION = 'A short description about your stream'
    ICECAST_GENRE = 'Genre of the music being streamed'
    ICECAST_URL = 'http://url-to-use-for-icecast-links.org'
    ICECAST_TRANSCODE = False  # Transcode stream to mp3 for browser compatibility

    # General app configuration
    ADMIN = ('user', 'password')  # Admin login details, in the form ('user', 'password') (tuple)
    FILE_SIZE_LIMIT = 524288000  # Largest allowed size for music uploads, in bytes (if PUBLIC_UPLOADS is True)
    PUBLIC_UPLOADS = False  # Allow anyone to upload (only logged-in admins otherwise)
    PUBLIC_DOWNLOADS = False  # Displays a download button next to songs in the song listing
    TITLE = 'SGFC Radio'  # Title of the site to show in headings and the browser title
    SONGS_PER_PAGE = 50  # Amount of songs to show on the songs page

    # CSS options for website
    # these must be bootstrap 4
    DEFAULT_CSS = 'Pulse'
    CSS = {
        'Cerulean': 'https://bootswatch.com/4/cerulean/bootstrap.min.css',
        'Cosmo': 'https://bootswatch.com/4/cosmo/bootstrap.min.css',
        'Cyborg': 'https://bootswatch.com/4/cyborg/bootstrap.min.css',
        'Darkly': 'https://bootswatch.com/4/darkly/bootstrap.min.css',
        'Flatly': 'https://bootswatch.com/4/flatly/bootstrap.min.css',
        'Journal': 'https://bootswatch.com/4/journal/bootstrap.min.css',
        'Litera': 'https://bootswatch.com/4/litera/bootstrap.min.css',
        'Lumen': 'https://bootswatch.com/4/lumen/bootstrap.min.css',
        'Lux': 'https://bootswatch.com/4/lux/bootstrap.min.css',
        'Materia': 'https://bootswatch.com/4/materia/bootstrap.min.css',
        'Minty': 'https://bootswatch.com/4/minty/bootstrap.min.css',
        'Pulse': 'https://bootswatch.com/4/pulse/bootstrap.min.css',
        'Sandstone': 'https://bootswatch.com/4/sandstone/bootstrap.min.css',
        'Simplex': 'https://bootswatch.com/4/simplex/bootstrap.min.css',
        'Sketchy': 'https://bootswatch.com/4/sketchy/bootstrap.min.css',
        'Slate': 'https://bootswatch.com/4/slate/bootstrap.min.css',
        'Solar': 'https://bootswatch.com/4/solar/bootstrap.min.css',
        'Spacelab': 'https://bootswatch.com/4/spacelab/bootstrap.min.css',
        'Superhero': 'https://bootswatch.com/4/superhero/bootstrap.min.css',
        'United': 'https://bootswatch.com/4/united/bootstrap.min.css',
        'Yeti': 'https://bootswatch.com/4/yeti/bootstrap.min.css'
    }
