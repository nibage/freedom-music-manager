#!/usr/bin/env python3
"""Generate original audio fixtures. Requires Python 3; ffmpeg enables six formats."""
import argparse
import json
import math
import shutil
import struct
import subprocess
import tempfile
import wave
import zlib
from pathlib import Path

TRACKS = [
    ('Aurora Signals', 'Northern Lights', 'First Light', 'Ambient', 2024, 1, 5, 'wav', 220),
    ('Aurora Signals', 'Northern Lights', 'Polar Drift', 'Ambient', 2024, 2, 7, 'flac', 261.63),
    ('Aurora Signals', 'Northern Lights', 'Blue Horizon', 'Ambient', 2024, 3, 8, 'mp3', 293.66),
    ('Copper Echo', 'City After Rain', 'Neon Steps', 'Electronic', 2025, 1, 6, 'ogg', 329.63),
    ('Copper Echo', 'City After Rain', 'Night Tram', 'Electronic', 2025, 2, 9, 'm4a', 392),
    ('Copper Echo', 'City After Rain', 'Quiet Junction', 'Electronic', 2025, 3, 10, 'opus', 349.23),
    ('Paper Harbor', 'Small Hours', 'Window Seat', 'Instrumental', 2023, 1, 5, 'wav', 440),
    ('Paper Harbor', 'Small Hours', 'Homeward', 'Instrumental', 2023, 2, 8, 'mp3', 523.25),
    ('Unknown Artist', 'Loose Tracks', 'Untitled', '', None, None, 4, 'wav', 196),
]
RATE = 22050


def riff_chunk(kind, payload):
    return kind + struct.pack('<I', len(payload)) + payload + b'\0' * (len(payload) % 2)


def write_wave(path, duration, hz, tags):
    frames = bytearray()
    for i in range(RATE * duration):
        t = i / RATE
        fade = min(1, t * 8, (duration - t) * 8)
        modulation = 0.5 + 0.5 * math.sin(2 * math.pi * 0.7 * t) ** 2
        value = 0.14 * fade * modulation * (math.sin(2 * math.pi * hz * t) + 0.35 * math.sin(2 * math.pi * hz * 1.5 * t))
        frames.extend(struct.pack('<h', int(32767 * value)))
    with wave.open(str(path), 'wb') as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(frames)
    path.write_bytes(wave_with_tags(path.read_bytes(), tags))


def wave_with_tags(data, tags):
    info = {'title': b'INAM', 'artist': b'IART', 'album': b'IPRD', 'genre': b'IGNR', 'date': b'ICRD', 'track': b'ITRK'}
    payload = b'INFO' + b''.join(riff_chunk(info[k], str(v).encode('utf-8') + b'\0') for k, v in tags.items() if v)
    if len(payload) > 4:
        data += riff_chunk(b'LIST', payload)
        return data[:4] + struct.pack('<I', len(data)-8) + data[8:]
    return data


def cover(path, seed):
    n = 192
    def chunk(k, v):
        return struct.pack('>I', len(v)) + k + v + struct.pack('>I', zlib.crc32(k+v)&0xffffffff)
    raw = bytearray()
    for y in range(n):
        raw.append(0)
        for x in range(n):
            r = math.hypot(x-n/2, y-n/2)
            ring = int(r/9) % 2 == 0
            raw.extend(((seed*51+x//3+(60 if ring else 0))%256, (seed*33+y//2)%256, (140+seed*17+x//5)%256))
    path.write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', n,n,8,2,0,0,0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))


def append_bulk(root, count, manifest, temp):
    # Reuse eight short original audio signals, but give each track unique metadata.
    # This keeps generation fast, even for thousands of real playable files.
    signals = []
    if count > len(manifest):
        for i in range(8):
            source = Path(temp)/f'bulk-{i}.wav'
            write_wave(source, 1, 180 + i * 30, {})
            signals.append(source.read_bytes())
    for i in range(count - len(manifest)):
        album_index, number = divmod(i, 50)
        artist = f'Stress Artist {album_index // 4 + 1:03d}'
        album = f'Stress Album {album_index + 1:03d}'
        title = f'Stress Track {i + 1:05d}'
        folder = root / 'Stress test' / artist / album
        folder.mkdir(parents=True, exist_ok=True)
        if number == 0:
            cover(folder/'cover.png', album_index + 11)
        tags = {'title': title, 'artist': artist, 'album': album,
                'genre': ['Ambient', 'Electronic', 'Instrumental', 'Rock'][album_index % 4],
                'date': str(2020 + album_index % 7), 'track': str(number + 1)}
        dest = folder / f'{number + 1:02d} - {title}.wav'
        dest.write_bytes(wave_with_tags(signals[i % len(signals)], tags))
        manifest.append({'path': dest.relative_to(root).as_posix(), 'tags': tags, 'duration_seconds': 1, 'format': 'wav'})

def extend_demo(root, count):
    """Add stress fixtures to the original nine-track demo, never overwrite audio."""
    manifest_path = root / 'expected-metadata.json'
    if not manifest_path.is_file() or manifest_path.is_symlink() or root.is_symlink():
        raise ValueError('Expected an existing generated demo-music directory')
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    if len(manifest) == count and count > len(TRACKS):
        if all((root / entry['path']).is_file() for entry in manifest):
            print(f'Demo already contains {count} tracks in {root}')
            return
    if len(manifest) != len(TRACKS) or count <= len(TRACKS):
        raise ValueError('Extension requires the original nine-track demo and a larger count')
    expected = {(artist, album, f'{number:02d} - {title}' if number is not None else title)
                for artist, album, title, _, _, number, _, _, _ in TRACKS}
    actual = set()
    for entry in manifest:
        rel = Path(entry['path'])
        if rel.is_absolute() or '..' in rel.parts or len(rel.parts) != 3 or not (root / rel).is_file():
            raise ValueError('Invalid or missing original demo track: ' + str(rel))
        actual.add((rel.parts[0], rel.parts[1], rel.stem))
    if actual != expected:
        raise ValueError('This is not the original generated demo library')
    if (root / 'Stress test').exists() or (root / 'Stress test').is_symlink():
        raise FileExistsError('Stress test folder already exists; refusing to overwrite it')
    # Stage files in the same filesystem; preserve the original manifest until all media exist.
    with tempfile.TemporaryDirectory(dir=root) as temp:
        staging = Path(temp)
        append_bulk(staging, count, manifest, temp)
        updated = staging / 'expected-metadata.json'
        updated.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        (staging / 'Stress test').rename(root / 'Stress test')
        try:
            updated.replace(manifest_path)
        except OSError:
            (root / 'Stress test').rename(staging / 'Stress test')
            raise
    print(f'Extended {root} to {len(manifest)} tracks')


def generate(root, count=9):
    if count < len(TRACKS):
        raise ValueError(f'count must be at least {len(TRACKS)}')
    # Never overwrite an existing library.
    root.mkdir(parents=True, exist_ok=False)
    ffmpeg = shutil.which('ffmpeg')
    manifest = []
    codecs = {'mp3': 'libmp3lame', 'flac': 'flac', 'ogg': 'libvorbis', 'm4a': 'aac', 'opus': 'libopus'}
    with tempfile.TemporaryDirectory() as temp:
        for i, (artist, album, title, genre, year, number, duration, ext, hz) in enumerate(TRACKS):
            folder = root / artist / album
            folder.mkdir(parents=True, exist_ok=True)
            if artist != 'Unknown Artist' and not (folder/'cover.png').exists():
                cover(folder/'cover.png', i+1)
            tags = {} if number is None else {'title': title, 'artist': artist, 'album': album, 'genre': genre, 'date': str(year), 'track': str(number)}
            stem = f'{number:02d} - {title}' if number is not None else title
            dest = folder / f'{stem}.{ext}'
            source = Path(temp)/'source.wav'
            write_wave(source, duration, hz, tags)
            if ext == 'wav' or not ffmpeg:
                dest = dest.with_suffix('.wav')
                shutil.copyfile(source, dest)
            else:
                cmd = [ffmpeg, '-nostdin', '-v', 'error', '-y', '-i', str(source), '-map_metadata', '-1', '-c:a', codecs[ext]]
                for key, value in tags.items():
                    cmd += ['-metadata', f'{key}={value}']
                try:
                    subprocess.run(cmd+[str(dest)], check=True, capture_output=True)
                except subprocess.CalledProcessError:
                    dest.unlink(missing_ok=True)
                    dest = dest.with_suffix('.wav')
                    shutil.copyfile(source, dest)
            manifest.append({'path': dest.relative_to(root).as_posix(), 'tags': tags, 'duration_seconds': duration, 'format': dest.suffix[1:]})
        append_bulk(root, count, manifest, temp)
    (root/'expected-metadata.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    (root/'README.txt').write_text('Synthetic demo tracks, generated locally. No commercial recordings.\nSelect this directory in Freedom Music Manager. expected-metadata.json describes the expected tags. Untitled has no embedded tags or cover.\n', encoding='utf-8')
    print(f'Created {len(manifest)} tracks in {root}: '+', '.join(sorted({t['format'] for t in manifest})))


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('directory', nargs='?', type=Path, default=Path('demo-music'))
    p.add_argument('--count', type=int, default=len(TRACKS), help='Total number of tracks (default: 9); extras are short tagged WAVs')
    p.add_argument('--extend', action='store_true', help='Add stress tracks to an existing original nine-track demo')
    args = p.parse_args()
    if args.count < len(TRACKS):
        p.error(f'--count must be at least {len(TRACKS)}')
    if args.extend:
        extend_demo(args.directory, args.count)
    else:
        generate(args.directory, args.count)
