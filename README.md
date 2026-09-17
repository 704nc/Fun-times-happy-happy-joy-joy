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

**Shell** — boot screen, lock screen with startup chime, desktop with icons and wallpapers, centered Win11 taskbar with Copilot, Start menu (pinned grid, All apps, live search over apps *and* your files), action center, calendar flyout, toast notifications, right-click context menus, a working Recycle Bin (delete → restore/empty), and draggable/resizable windows with edge snapping (drag to top = maximize, left/right = half-snap).

**Installable PWA** — a service worker caches everything for offline use, and the manifest makes it installable: "Add to Home Screen" on iOS/Android or the install icon in the address bar on desktop gives you a standalone Windows-11-in-a-window, no browser chrome.

**Touch-friendly** — on touch screens a single tap opens icons and files, and windows open maximized on phone-sized displays.

**Copilot** — the taskbar assistant. It's a proudly local pile of if-statements that can open apps ("open excel"), evaluate math, tell jokes, toggle dark mode, change your wallpaper, summon Clippy, start a party, lock the PC, or crash it on request.

**Fun stuff (new)**
- **Xbox Achievements** — 20 achievements with gamerscore, unlock toasts and a chime. Two are secret. Reset PC wipes them, so be careful.
- **Clippy** — Settings → Fun, or ask Copilot. Offers context-aware tips when you open Word, Excel, Terminal… Right-click him to make him leave.
- **Screensavers** — Bubbles, Starfield, Mystify and a bouncing logo. Kicks in after 5 idle minutes by default (configurable in Settings → Fun); any input dismisses it.
- **Task Manager** — Ctrl+Shift+Esc. Live CPU graph, per-window "usage", End task actually closes windows. Ending Windows Explorer or Desktop Window Manager does what you'd expect.
- **Keyboard shortcuts** — Alt+Tab (or Alt+`) window switcher, Ctrl+Esc for Start, Win+D show desktop, Win+E Explorer, Win+I Settings.
- **Power menu** — the Start power button now offers Lock (real lock screen), Sleep (screensaver), Restart and Shut down ("It's now safe to turn off your computer").
- **Konami code** — ↑↑↓↓←→←→BA on the desktop. Confetti, rainbow accent, chiptune fanfare.
- **BSOD** — `bsod` in Terminal, or ask Copilot to crash. Percent counter, fake QR code, then a "reboot".
- **Terminal extras** — `cowsay`, `fortune`, `neofetch`, `sl`, `clippy`, `screensaver [style]`, `party`, `achievements`, `hiscores`, `taskmgr`, `lock`.

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

**Microsoft Store — with apps you can actually download.** Installing shows a download progress bar, then the app appears in Start, on the desktop, and in your library (persisted). Catalog: Minesweeper, Snake, 2048, Tic-Tac-Toe (minimax AI — it won't lose), **Breakout** (infinite levels, armored bricks), **Pong** (vs. a beatable CPU, first to 7), **Flappy Window** (a tiny Windows logo, aggressively unfair), Sticky Notes, MSN Weather, Clock/stopwatch, Tiny Piano (playable, keyboard mapped), Microsoft To Do. Games keep high scores and feed the achievements system. All uninstallable from the Store or Settings → Apps.

## Performance notes

- Zero dependencies, ~160 KB of unminified source total; wallpapers and sample photos are inline SVG, so there are no image downloads.
- Windows are plain DOM nodes; only visible UI is rendered, timers are per-open-window and cleaned up on close.
- Music is scheduled through a single shared WebAudio context with a lookahead scheduler — no audio files to fetch.

Not affiliated with Microsoft — this is a loving fan recreation for fun.
