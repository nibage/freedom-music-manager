# Freedom Music Manager — technical reference

## Application and portable data

The canonical entry point is `__music/index.html`. No build step is required to run it. Use a recent desktop Chromium browser with the File System Access API and read/write access to the chosen folder. The HTML does not need an HTTP server. The browser may ask permission again when moving to another computer.

| Path in `__music/data/` | Purpose |
| --- | --- |
| files.txt | Relative paths of indexed audio files |
| media-info.tsv | File size, modification time and optional sampled fingerprint |
| collections/*.txt | Ordered relative paths, one per line |
| favorites.txt | Favorite paths |
| tags.tsv, tag-catalog.txt | Track tags and reusable tag names |
| trash.txt | Reversible exclusion from ordinary views |
| music-history.json | Last 200 playback starts |
| music-metadata.json | Derived tag/duration cache, versioned and validated against file size/time |
| thumbs.tsv, thumbs/ | Derived WebP covers and their index |
| path-config.json | Optional local absolute-path configuration |
| music-layout-v1.json | Completed legacy layout migration marker |

Metadata is stored separately from the audio. No audio tag editing is implemented. Cache invalidation uses size and modification time, not a full cryptographic hash. A same-size change that preserves the timestamp may require deleting the derived cache and reopening the library.

## Migration

Back up your library metadata first. The app recognizes legacy `__gallery/data/` and `_gallery/data/`. After confirmation it copies known metadata files, including former `albums/*.txt`, into `__music/data/collections/`. Existing unequal destination files are not overwritten. Old files remain in place. Generated thumbnails are regenerated. If two legacy roots contain data, the app stops and asks you to resolve the source before retrying. A partially copied identical file is safe to reuse on retry.

The earlier experimental `music-collections.json` is imported into the unified collection system. Name/order collisions get an imported suffix. History moves to its own file. Keep the old JSON as a backup. After successful migration use only the new application.

## Playback and filtering

A single audio element is independent of the details dialog. Clicking a cover snapshots matching tracks into the queue. Changing filters does not replace that queue. Explicit queue editing deduplicates paths. Shuffle randomizes the unplayed suffix; manual edits take precedence. Repeat one repeats at natural end, manual next ignores it; repeat all wraps. Live queue and play position are session-local. Collections persist ordered paths.

Artist, album, genre and year are read from supported embedded tags; missing tags are distinguished from pending reads. Metadata filters combine using AND; custom collection/tag/Favorites/Trash predicates use their selected OFF/OR/AND setting. The selected metadata facets, search, format and applicable folder must all match that sidebar result. Folder Lock keeps the folder restriction when choosing sidebar criteria; if unlocked, a selected sidebar criterion searches across the library. Reset filters clears metadata/search/format/folder, but leaves sidebar criteria and sort order unchanged. Duration buckets are <120, 120–299.999 and >=300 seconds. Metadata extraction is bounded, so large or unusual tag blocks may be incomplete. Native playback determines codec support.

## Safety

In-app Trash hides tracks without deleting them. Permanent deletion explicitly removes the indexed file, not the OS Recycle Bin. Rebuilding the index can clean stale references after a successful scan; make sure all drives and folders are mounted. Approved move suggestions can remap stored metadata, but sampled fingerprints are not a guarantee of full file identity. Back up personal metadata and originals independently.

## Release checklist

1. Generate demo with FFmpeg and run metadata and pure-logic tests.
2. Run Chromium integration test and review generated screenshots of Classic/Detailed and light/dark/mobile.
3. Manually open an extracted app through file:// in Chrome and Edge, confirm folder permissions, migration on a copied library, supported audio playback, real file persistence and Trash behavior.
4. Build allowlisted ZIPs; verify contents and checksums. No personal data or legacy photo demo is included.
5. Tag a reviewed commit only after the checks are green.
