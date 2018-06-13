import os

from jinja2 import Environment, FileSystemLoader

from radio.config import Config

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
j2_env = Environment(loader=FileSystemLoader(THIS_DIR), trim_blocks=True)

with open('icecast.xml', 'w') as f:
    template = j2_env.get_template('icecast-template.xml').render(Config=Config)
    f.write(template)
    print('wrote icecast.xml with values from radio/config.py')

