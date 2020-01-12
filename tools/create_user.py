import argparse

from radio.common.users import register, user_exists, valid_username
from radio.models import User, commit, db_session

parser = argparse.ArgumentParser()
parser.add_argument('username', type=str)
parser.add_argument('-p', '--password', type=str)
parser.add_argument('--admin', action='store_true')
args = parser.parse_args()

with db_session:
    if user_exists(args.username):
        if not args.admin:
            print(f'User "{args.username}" already exists.')
        else:
            print(f'User "{args.username}" exists. Making them an admin.')
            user = User.get(username=args.username)
            user.admin = True
            commit()

    else:
        validator = valid_username(args.username)
        if validator.valid:
            if args.password:
                success = register(args.username, args.password,
                                   admin=args.admin, validate=False)
                if success:
                    print(f'User "{args.username}" successfully created.')
            else:
                print(f'No password specified.')
        else:
            print(f'Username "{args.username}" is not valid. ({validator.reason})')

print(f'Exiting...')
