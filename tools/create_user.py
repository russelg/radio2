import argparse

from radio import models as db
from radio.common.users import register, user_exists, valid_username

parser = argparse.ArgumentParser()
parser.add_argument('username', type=str)
parser.add_argument('-p', '--password', type=str)
parser.add_argument('--admin', action='store_true')
args = parser.parse_args()

with db.db_session:
    if user_exists(args.username):
        if not args.admin:
            print(f'User "{args.username}" already exists.')
        else:
            print(f'User "{args.username}" exists. Making them an admin.')
            user = db.User.get(username=args.username)
            user.admin = True
            db.commit()

    else:
        valid = valid_username(args.username)
        if valid.valid:
            if args.password:
                success = register(args.username, args.password,
                                   admin=args.admin, validate=False)
                if success:
                    print(f'User "{args.username}" successfully created.')
            else:
                print(f'No password specified.')
        else:
            print(f'Username "{args.username}" is not valid. ({valid.reason})')

print(f'Exiting...')
