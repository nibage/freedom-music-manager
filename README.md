# Freedom Music Manager

**Version 1.0.0 — release candidate**

A portable, private music library and player derived from [Freedom Gallery](https://github.com/nibage/freedom_gallery). Your audio files stay where they are. No server, account, cloud upload or runtime dependencies.

[Builds and checks](https://github.com/nibage/freedom-music-manager/actions/workflows/build.yml) · [Releases](https://github.com/nibage/freedom-music-manager/releases) · [Technical reference](docs/REFERENCE.md)

## Install

1. Download an application ZIP from a successful Actions build, or a published release when available.
2. Extract the `__music/` folder into the root of your music library.
3. Open `__music/index.html` in a recent desktop Chrome or Edge.
4. Click **Open library**, select your music root (not `__music`) and grant read/write access. The app indexes your music locally.

```text
Music/
├── Artist/Album/01 - Track.flac
├── Artist/Album/cover.png
└── __music/index.html
```

The demo ZIP contains nine synthetic tracks in WAV, MP3, FLAC, Ogg Vorbis, M4A and Opus with known metadata, three original sidecar covers, and an untagged track. Select the included `demo-music` directory instead of your own library. No commercial recordings are included.

## Features

- **Classic View**: square album/track cover cards. **Detailed View**: a list with title, artist, album, genre, year, disc, track, format, duration and relative path when available.
- Search and combine artist, album, genre, year, duration, format, folder, tags, favorites and music collection filters. Sort ascending/descending; default order respects a single saved collection.
- Click artwork or title to select and prepare a track; press Play to start it; click ⓘ for track details and membership. The persistent player continues while browsing. Space toggles play/pause when not editing.
- Queue, play next, reorder, shuffle, repeat one/all, volume and seek. The queue dialog has a fixed large viewport-relative size and a History / Queue toggle. Click a row to highlight it. Play starts the selected or first playable track on the current page; while audio is playing the button pauses it. Playing history adds the track to the existing queue if needed rather than replacing that queue. Add current results adds all filter-matching tracks without duplicates; it and Clear queue are hidden in History. Clear history is at the right of the pagination row. Save a queue as a named music collection; play, load or append a collection from the queue dialog.
- **Music Collections** are ordered virtual groups (also playlists); **Album** is the actual audio tag. Tracks may belong to multiple collections and tags without duplication.
- Reversible in-app Trash; permanent deletion requires explicit confirmation and does not use the operating system's Recycle Bin.
- Local listening history (up to 200 entries), metadata cache validated against file size and modification time, lazy cover previews, themes, and one-step undo for supported collection/tag/favorite edits.

**← Back** restores the previous search results, including folder, audio format, music collections, tags, favorites, Trash, OFF/OR/AND, folder lock, metadata filters and sort order. It retains up to 50 navigation steps in the current library session; opening a library resets the history. If a track selection is active, Back first clears it and returns the panel to the current track without interrupting playback. It does not undo metadata edits or affect playback.

**Clear cache** (bottom sidebar, alongside Rebuild index and Remove thumbs) resets only this copy's browser storage: saved directory handles, view preferences, theme, folder lock, collection operator, sorting and player volume. It discards obsolete name-only shortcuts and ignores invalid handles. After confirmation the app reloads; playback stops, but tracks, music collections, tags, favorites, listening history and derived disk caches remain intact. Browser-managed permissions may remain. Close other Music Manager tabs before resetting.

Click a track (cover or caption) to select it exclusively and prepare it in the bottom player without autoplay. Ctrl/Cmd-click toggles tracks in a multi-selection; Shift-click selects a range. Selecting another track changes only the preview in the player; the existing audio, playback position and queue remain intact. Press Play to explicitly start the selected track. Back or Escape dismisses the selection and returns the panel to the actual current track. **Play next** acts on selected tracks. Hover over the Queue button to reveal a green + for adding missing selected tracks or − for removing selected queued tracks; the current playback anchor is protected. Touch devices show the action without hover. Use the ⓘ button for track details.

## How filters combine

Creating a new music collection or tag from the sidebar automatically assigns all currently selected tracks. With no selection, it is created empty. Creating one from track details assigns the open track only. Original files are not copied; Ctrl+Z can undo creation and membership together.


The sidebar OFF / OR / AND button affects only selected Music Collections, custom tags, Favorites and Trash. OFF selects one criterion; OR matches any selected criterion; AND matches every selected criterion. Artist, actual Album, Genre, Year, Duration, search and Format always narrow the resulting tracks using AND. A locked folder always narrows results; an unlocked folder is ignored while any sidebar criterion is selected. Reset filters clears metadata, search, format and folder, not the sidebar selection or sort order. Metadata options include counts within the current scope.

## Formats

MP3, FLAC, WAV, Ogg Vorbis/Opus and M4A/ALAC containers have built-in metadata readers. AAC, AIFF/AIF, WMA and raw ALAC extensions are indexed but tag parsing is not implemented for every variant. Playback depends on the browser and codec; recognition of a filename is not a guarantee of decoding. Metadata may be incomplete for damaged files, unusual tags and CBR MP3 without duration headers. Audio tags are read, not rewritten.

## Storage and updates

`__music/data/` holds relative-path indexes, collections, tags, favorites, trash, history and derived caches. To update, replace only `__music/index.html`; back up the data directory before upgrading.

Older `__gallery/data/` metadata can be copied to the new layout with confirmation. The source is retained as a backup; conflicting files halt the migration. The old application should not be used to edit the same library after migration. Do not copy personal metadata into this source repository.

## Development

```sh
python3 scripts/generate_music_demo.py demo-music
node --test tests/music-*.test.mjs tests/unified-music-collections.test.mjs
npm install --no-save --no-package-lock playwright@1.56.1
npx playwright install chromium
node scripts/capture-screenshots.mjs
python3 scripts/build_music_release.py v1.0.0-rc.3
```

FFmpeg is needed to generate all six demo formats; otherwise the generator falls back to WAV. CI requires all six. The browser test uses real synthetic audio bytes and mock filesystem handles, not personal files. Native folder-picker permissions still require manual testing in Chrome/Edge. Release candidate status is retained until CI and manual checks are confirmed.

Licensed under GNU GPL v3; see [LICENSE](LICENSE). Adapted from Freedom Gallery, modified in November 2026.
