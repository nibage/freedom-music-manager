#!/usr/bin/env python3
"""Build explicit allowlisted app and demo release ZIPs (no personal data)."""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALLOWED_FORMATS = {'wav', 'mp3', 'flac', 'ogg', 'm4a', 'opus'}
SCREENSHOTS = ['classic-dark.png', 'detailed-dark.png', 'classic-light.png', 'mobile-light.png']


def build(version, demo):
    if not re.fullmatch(r'v[0-9]+\.[0-9]+\.[0-9]+(?:[-.][a-zA-Z0-9.-]+)?', version):
        raise ValueError('Expected a version such as v1.0.0-rc.1')
    app = {name: ROOT/name for name in ['__music/index.html', 'README.md', 'LICENSE', 'docs/REFERENCE.md']}
    # Only the current screenshot script's exact filenames are eligible.
    for name in SCREENSHOTS:
        path = ROOT/'docs'/'screenshots'/name
        if path.is_file() and (ROOT/'docs'/'screenshots'/'music-capture.ok').is_file():
            app['docs/screenshots/'+name] = path
    manifest = json.loads((demo/'expected-metadata.json').read_text(encoding='utf-8'))
    if len(manifest) < 9:
        raise ValueError('Expected at least nine synthetic tracks')
    media = {}
    formats = set()
    for entry in manifest:
        rel = Path(entry['path'])
        if rel.is_absolute() or '..' in rel.parts or rel.suffix[1:] not in ALLOWED_FORMATS:
            raise ValueError('Invalid demo path: '+str(rel))
        path = demo/rel
        if not path.is_file() or path.is_symlink():
            raise ValueError('Missing demo track: '+str(rel))
        formats.add(rel.suffix[1:])
        media['demo-music/'+rel.as_posix()] = path
        cover = path.parent/'cover.png'
        if cover.is_file() and not cover.is_symlink():
            media['demo-music/'+(rel.parent/'cover.png').as_posix()] = cover
    if formats != ALLOWED_FORMATS:
        raise ValueError('Demo packaging requires FFmpeg with all six codecs: '+str(formats))
    for name in ['expected-metadata.json', 'README.txt']:
        media['demo-music/'+name] = demo/name
    dist = ROOT/'dist'
    dist.mkdir(exist_ok=True)
    hashes = []
    for prefix,files in [('freedom-music-manager', app), ('freedom-music-manager-demo', {**app, **media})]:
        out = dist/(prefix+'-'+version+'.zip')
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for name, source in sorted(files.items()):
                if not source.is_file() or source.is_symlink():
                    raise ValueError('Missing or linked release input: '+str(source))
                z.write(source, name)
        with zipfile.ZipFile(out) as z:
            assert set(z.namelist()) == set(files) and z.testzip() is None
        hashes.append(hashlib.sha256(out.read_bytes()).hexdigest()+'  '+out.name)
        print(out.name, out.stat().st_size, 'bytes; entries:', len(files))
    (dist/'SHA256SUMS.txt').write_text('\n'.join(hashes)+'\n', encoding='utf-8')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('version')
    p.add_argument('--demo', type=Path, default=ROOT/'demo-music')
    args = p.parse_args()
    build(args.version, args.demo.resolve())
