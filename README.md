# Local Media Gallery

A **portable, offline photo and video gallery** in one `__gallery/index.html` file. No backend, cloud account, build process, or media database. Photos and videos remain in their folders; favorites, tags, albums, index, and cached previews stay in readable files under `__gallery/data/`.

> Browser: use **Chrome or Edge** (Chromium File System Access API). Firefox cannot grant the persistent, writable folder access this app requires. The gallery never uploads original media.

## Try the included demo after cloning

This repository includes a **`demo-gallery/`** folder alongside `__gallery/`, containing 16 original SVG sample illustrations, pre-populated favorites, tags, and virtual albums. No extra downloads needed.

1. Clone or download this repository.
2. Open `__gallery/index.html` in **Chrome or Edge** (double-click it, no server).
3. Click **Open library**, and select the **`demo-gallery` folder** (not its inner `__gallery`). Allow read/write folder access.
4. Experiment with Classic / Instagram, Light / Dark, multi-selection, albums, tags, favorites, and full-screen previews.

The browser requires that **one manual folder selection** before it can read local media. On later launches, the most recent library loads automatically if permission is still granted; otherwise select it from the recent-library dropdown to grant access again.

The demo media are original SVG illustrations (included as plain text files), intended only for demonstration. Do not use permanent deletion on demo files unless you want them removed.

## Install for a personal photo library

Place `__gallery/` in your real media library root:

```text
Pictures/
├── 2024/
│   └── sample.jpg
├── 2025/
│   └── vacation.mp4
└── __gallery/
    ├── index.html
    └── data/              # created automatically
        ├── files.txt      # relative path inventory
        ├── favorites.txt  # one path per line
        ├── tags.tsv       # path<TAB>tag1, tag2
        ├── trash.txt      # reversible in-gallery trash list
        ├── media-info.tsv # signatures for move/rename suggestions
        ├── thumbs.tsv     # WebP thumbnail manifest
        ├── path-config.json
        ├── albums/        # one .txt per album
        └── thumbs/        # generated WebP previews
```

Open `Pictures/__gallery/index.html`, click **Open library** and select **Pictures**. The first launch indexes its media. Future launches reuse the saved `data/files.txt` index without rescanning.

### Copy full path across Windows, Linux, and macOS

When `index.html` is opened locally (`file://`) inside **the same** library that is selected, the app derives the full filesystem path from the **HTML file's own URL** — *not from the folder picker*, which is forbidden from revealing absolute paths. The detected path is saved in `data/path-config.json`, with separate entries for Windows, macOS and Linux. This keeps **Copy full path** convenient across operating systems.

If you select a **different** library from the one containing the HTML file, or use an HTTP URL, the app cannot infer its real path. The **first Copy full path** will ask you to enter the absolute library path manually. This is a browser security limitation, not a requirement for showing photos.

If a remembered folder is moved, deleted, disconnected, or access is revoked, automatic reopening may fail. The gallery does **not** delete your metadata. Use **Open library** to select the current folder again; if your files moved, use **Rebuild index** to fix stale relative paths.

## Features and controls

| Control | Use case |
| --- | --- |
| **Open library** | Select the media root. Reuse its saved index and metadata, or scan from scratch if no index exists. |
| **Recent libraries** | Shows the **currently selected** library and lets you switch remembered folders. |
| **Remove library** | Remove the selected shortcut from browser history. Does **not** delete anything on disk. |
| **Rebuild index** | Rescan subfolders after adding, moving, renaming, or deleting files. Review proposed move/rename metadata transfers. After a **successful** scan, remove stale file references and outdated cached previews automatically; no backups are made. |
| **Rebuild thumbnails** | Reset the derived WebP cache. Use it if previews look broken or dated; photos, tags, albums, and file index remain unchanged. |
| **Theme: System / Light / Dark** | Follow your OS preference, or override it independently for this HTML gallery. |
| **Classic / Instagram** | Switch between labeled cards and a gapless square-tile grid. The selected layout is remembered. |
| **Folder / type filters** | Search inside a chosen folder and its subfolders, photos only, videos only, or all media. |
| **Albums / Tags** | Switch the sidebar between searchable album names and tag chips. Selected tags have a **green outline**; selecting several tags uses **AND**, matching only files containing all of them. |
| **+ New / − Remove** | Create or delete a virtual album; in Tags mode, create a new tag for selected media or remove selected tags from all media. Original files are never deleted by these collection actions. |
| **Favorites / Trash** | Filter favorite files or view media hidden in the reversible in-gallery Trash. |
| **Show all in folder** | Show all indexed media in the current file's folder and its subfolders **inside the gallery**. It does not launch Explorer or Finder. |
| **Copy full path** | Copy the complete path if known/inferred; otherwise enter the library root path once. |

All main controls and viewer actions include mouse-hover `title` tooltips.

### Selecting multiple media files (both Classic and Instagram)

- **Ctrl+click / Cmd+click** toggles one image or video without opening it.
- **Shift+click** selects an inclusive range between the selection anchor and clicked tile (only among currently loaded/visible cards).
- **Click Select** to use ordinary clicks for selection rather than opening.
- **Mouse drag** creates a selection rectangle over displayed cards.
- **Long-press** a thumbnail (mouse, touch, or stylus) to begin selection. You can then slide across more thumbnails to add them, where supported by the browser.

A selected-file bar lets you **Favorite selected**, **Add to album**, **Add tag**, or **Move to Trash** / **Restore selected**. Bulk actions never physically delete media. The temporary selection clears when filters/views change or the index is rebuilt.

### Albums and tags

Albums are text files of relative paths: `data/albums/<album name>.txt`. A file can belong to many albums without being copied. Tags live together in `data/tags.tsv` as tab-separated rows; no database and no per-tag folders are created. The tags sidebar lists at most 300 matching tags at a time; search narrows the list. Long album names are ellipsized, with their complete names in hover help. Both lists are scrollable.

Normal search and folder selection combine with **AND**. Choosing an album or any tag resets the folder filter to **All folders**, so the collection first shows media across the library. You can then select a folder to narrow that collection.

### Index cleanup and moving between computers

`Rebuild index` examines the actual folder tree, optionally transfers metadata for recognized moves/renames after approval, and cleans obsolete references/previews. **No automatic backup is created.** Because automatic cleanup removes references to missing media, ensure you selected the correct library and all expected drives/mounts are available *before rebuilding*. As a safety check, a rebuild with a suspiciously large disappearance of files **skips destructive cleanup**.

If images break after a mass rename or filesystem reorganization: first **Rebuild index**, then **Rebuild thumbnails** only if the paths are correct and previews still fail. Avoid deleting `data/`, since it also contains favorites, albums, and tags.

The file index and album/tag paths are **relative to the selected library root**, making them portable across Windows, macOS, and Linux. Browser-granted folder permissions and absolute paths are different on each machine.

## Deletion warning

**Move to Trash** adds a path to `data/trash.txt` and hides it from normal views; the original file **stays where it is** and can be restored.

**Delete permanently** and **Delete all** physically remove original files from disk after a confirmation dialog. The dialog closes harmlessly on Cancel, ×, Esc, or click outside. Permanent deletion **bypasses the operating-system Recycle Bin/Trash and cannot be undone**. There is no automatic backup. Test it on disposable files first.

## Keyboard shortcuts

- `←` / `→` — previous / next item in viewer (except when video controls have focus)
- `F` — toggle favorite for the currently open item
- `Esc` — close viewer / confirmation
- `/` — focus media search
- `Ctrl`/`Cmd`+click — toggle item selection
- `Shift`+click — select an inclusive range
- Drag / long-press — select a group of visible cards

## Upgrading and publishing

To upgrade from v6.10 (or an earlier version using `__gallery/data/`), **replace only `__gallery/index.html`**. Existing text files and high-resolution thumbnails are preserved. No legacy metadata migration or separate server is required.

The included `.gitignore` intentionally only tracks the app, README, and **bundled demo**. Do **not** publish your personal photos or the generated `__gallery/data/` from your real library. This repository is distributed under the license published in the GitHub repository (see `LICENSE`).
