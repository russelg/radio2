import argparse
import concurrent.futures
from pathlib import Path

from radio.common.utils import encode_file, next_song, reload_songs

parser = argparse.ArgumentParser()
parser.add_argument("paths", nargs="*")
parser.add_argument("--skip", action="store_true")
parser.add_argument("--remove-original", action="store_true")
parser.add_argument("--seed", type=int, default=0)
args = parser.parse_args()


def encode(arg: Path) -> Path:
    encode_file(arg, remove_original=args.remove_original)
    print(str(arg) + " completed.")
    return arg


if not args.skip:
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(encode, Path(file)): file for file in args.paths}
        for future in concurrent.futures.as_completed(futures):
            print(future.result())

reload_songs()

if args.seed and args.seed > 0:
    for _ in range(args.seed):
        next_song()
