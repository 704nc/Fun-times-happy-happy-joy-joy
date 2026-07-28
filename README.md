# Windows 11 Web 🪟

A browser-friendly replica of Windows 11, built entirely with vanilla HTML/CSS/JS — no frameworks, no build step, no server. Open `index.html` and you have a desktop.

## Run it

```bash
# option 1: just open the file
open index.html          # macOS
start index.html         # Windows

# option 2: serve it (recommended, identical result)
python3 -m http.server 8000
# then visit http://localhost:8000
```

Works in any modern Chromium/Firefox/Safari browser. Everything is client-side; your files, settings and installed apps persist in `localStorage`.

## What's inside

**Shell** — boot screen, desktop with icons and wallpapers, centered Win11 taskbar, Start menu (pinned grid, All apps, live search over apps *and* your files), action center, calendar flyout, toast notifications, right-click context menus, draggable/resizable windows with edge snapping (drag to top = maximize, left/right = half-snap).

**Built-in apps — all functional:**

| App | What actually works |
|---|---|
| File Explorer | Browse, create, rename, delete files/folders in a persistent virtual C: drive; double-click opens files in the right app |
| Word | Rich-text editing (bold/italic/lists/headings/colors), word count, saves `.doc` files to Documents |
| Excel | Real formula engine — `=SUM(A1:A5)`, `AVG`, `MIN`, `MAX`, `COUNT`, arithmetic, cell references, circular-ref detection; saves `.xls` |
| PowerPoint | Slide editor with thumbnails + full-screen Present mode (arrow keys); saves `.ppt` |
| Photos | Gallery of the virtual Pictures folder, viewer with next/prev, import your own images, set-as-wallpaper |
| Media Player | Plays the built-in music library (synthesized live via WebAudio), plus any audio/video file you open from disk; seek bar + visualizer |
| Spotify | Full clone UI — albums, search, library, queue, working play/pause/next/seek/volume. Every track is procedurally composed and actually plays |
| Slack / Discord | Channels, persistent message history, and chatty bot coworkers/gamers who type back |
| Microsoft Edge | Browser-in-a-browser with URL bar and frame-friendly start tiles (many big sites refuse iframes — that's the web, not a bug) |
| Notepad, Paint, Calculator, Terminal, Settings | The classics: Paint has shapes + flood fill and saves PNGs; Terminal has a real command set over the virtual FS (`help`); Settings does themes, wallpapers, accent colors, storage and Reset PC |

**Microsoft Store — with apps you can actually download.** Installing shows a download progress bar, then the app appears in Start, on the desktop, and in your library (persisted). Catalog: Minesweeper, Snake, 2048, Tic-Tac-Toe (minimax AI — it won't lose), Sticky Notes, MSN Weather, Clock/stopwatch, Tiny Piano (playable, keyboard mapped), Microsoft To Do. All uninstallable from the Store or Settings → Apps.

## Performance notes

- Zero dependencies, ~120 KB of unminified source total; wallpapers and sample photos are inline SVG, so there are no image downloads.
- Windows are plain DOM nodes; only visible UI is rendered, timers are per-open-window and cleaned up on close.
- Music is scheduled through a single shared WebAudio context with a lookahead scheduler — no audio files to fetch.

Not affiliated with Microsoft — this is a loving fan recreation for fun.
