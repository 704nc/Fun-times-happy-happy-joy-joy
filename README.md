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
- **Task Manager** — Ctrl+Shift+Esc. Processes with a live CPU graph and End task, a Performance tab (JS heap, storage, uptime, network), and a Startup tab for Clippy, Neko and friends.
- **Keyboard shortcuts** — Alt+Tab (or Alt+`) window switcher, Ctrl+Esc for Start, Win+D show desktop, Win+E Explorer, Win+I Settings.
- **Power menu** — the Start power button now offers Lock (real lock screen), Sleep (screensaver), Restart and Shut down ("It's now safe to turn off your computer").
- **Konami code** — ↑↑↓↓←→←→BA on the desktop. Confetti, rainbow accent, chiptune fanfare.
- **BSOD** — `bsod` in Terminal, or ask Copilot to crash. Percent counter, fake QR code, then a "reboot".
- **Solitaire** — Klondike in the Store. Click or drag, double-click to auto-foundation, undo, and the bouncing-cards win animation.
- **Virtual desktops + Task View** — taskbar button or Win+Tab. Create desktops, move windows between them (right-click a thumbnail), Ctrl+Win+←/→ to switch.
- **Snap Layouts** — hover the maximize button for halves, thirds and quadrants.
- **Notification center** — click the clock. Every toast lands there; clear one or all.
- **Widgets panel** — the weather button. Clock, forecast, To Do, "MSN-ish" headlines that change hourly, a Memories photo, Xbox and system cards.
- **Windows Spotlight** — a procedurally painted wallpaper that's different every day. Settings → Personalization.
- **Emoji panel** — Win+. in any text field (Notepad, Word, Slack…). Remembers your recent picks.
- **Camera** — real webcam viewfinder with filters; photos save to Pictures › Camera Roll and show up in Photos and the Widgets panel.
- **Neko** — a desktop cat from the Store that chases your mouse and naps when you stop. Pet her.
- **Accounts & Accessibility** — rename yourself, pick an emoji avatar, turn on Narrator (reads toasts and Clippy aloud) or rainbow mouse trails.
- **Matrix** screensaver, minimize/restore animations, and Task Manager knows about all of it.
- **Desktop icons** drag anywhere and stay put; right-click → Auto arrange to reset. **Wallpaper slideshow** in Personalization. **Win + /** shows a keyboard-shortcut cheat sheet.
- **Deep links** — `?app=terminal` (or any app id, plus `&path=`) opens it after sign-in; the PWA manifest ships shortcuts for Terminal, Store, Xbox and Camera.
- **Snipping Tool** — Win+Shift+S captures the whole desktop (DOM → SVG → JPEG, no libraries) into Pictures › Screenshots; the app adds active-window capture and delays. Chrome/Edge.
- **Windows Hello** — "Sign in with your face" on the lock screen uses your real camera; the recognition is pure theatre.
- **Voice typing** — Win+H dictates into any text field (Web Speech API, Chrome/Edge).
- **Do not disturb** and **Battery saver** tiles in the action center; muted toasts collect in the notification center.
- **Right-click everything** — taskbar buttons (pin/unpin/close), the taskbar itself, and Start apps (pin, uninstall, "Run as administrator"). Start's Recommended section shows your recently opened files. Widgets gets a Stocks card with sparklines.
- **Now playing** — a 🎵 tray icon with a media flyout (track, progress, prev/play/next) whenever Spotify or Media Player is playing.
- **Accessibility** — text size 100–150%, high-contrast mode, Narrator, mouse trails, emoji panel.
- **Lock screen** shows the weather, your next event, unread mail and notification count.
- **First-run setup** — a Windows-style OOBE on first boot: name, avatar, visual style, wallpaper, extras. Skippable.
- **Copilot voice** — 🎤 in Copilot uses the Web Speech API (Chrome/Edge). Narrator reads replies aloud if enabled.
- **Action center** — Wi-Fi and Bluetooth panels with (fake) networks and devices, airplane mode, real online/offline detection, and the real battery level in the tray.
- **Clipboard history** — Win+V. Everything you copy inside the OS, click to paste.
- **Retro themes** — Settings → Personalization → Visual style: **Windows XP** (Luna, Bliss, the green start button) or **Windows 95** (Classic teal, bevels, MS Sans Serif). Each has its own startup chime.
- **Live wallpaper** — "Aurora (animated)" in the wallpaper picker.
- **Run dialog** — Win+R. `calc`, `cmd`, `mspaint`, a path, a URL, `winver`, `regedit` (no).
- **Windows Update** — Settings → Windows Update. Check, download, "Restart now", the blue "Working on updates" screen, a reboot, and a Tips & What's New app afterwards.
- **Start search** — inline math (`12*12`), Settings pages, commands (lock, sleep, task view…), and a web-search fallback.
- **Terminal extras** — `cowsay`, `fortune`, `neofetch`, `sl`, `clippy`, `screensaver [style]`, `party`, `achievements`, `hiscores`, `taskmgr`, `lock`.

**Built-in apps — all functional:**

| App | What actually works |
|---|---|
| MSN Weather | **Real** 7-day forecast from Open-Meteo (no key) for any city or your GPS location, °F/°C. Feeds the taskbar, the Widgets panel and Copilot. Offline it falls back to a deterministic Webville forecast |
| File Explorer | Browse, create, rename, delete files/folders in a persistent virtual C: drive; double-click opens files in the right app. Upload or drag real files in, download any file back out. List/grid views, sort, in-folder search, Properties, Copy/Cut/Paste (Ctrl+C/X/V), Open with… |
| Word | Rich-text editing (bold/italic/lists/headings/colors), word count, saves `.doc` files to Documents |
| Excel | Real formula engine — `=SUM(A1:A5)`, `AVG`, `MIN`, `MAX`, `COUNT`, arithmetic, cell references, circular-ref detection; bar/line/pie charts from a range; saves `.xls` |
| PowerPoint | Slide editor with thumbnails + full-screen Present mode (arrow keys); saves `.ppt` |
| Photos | Gallery of the virtual Pictures folder, viewer with next/prev, rotate, filters, save-a-copy, slideshow, delete, import your own images, set-as-wallpaper |
| Media Player | Plays the built-in music library (synthesized live via WebAudio), plus any audio/video file you open from disk; seek bar + visualizer |
| Spotify | Full clone UI — albums, search, library, queue, working play/pause/next/seek/volume. Every track is procedurally composed and actually plays |
| Slack / Discord | Channels, persistent message history, and chatty bot coworkers/gamers who type back |
| Microsoft Edge | Browser-in-a-browser with tabs, bookmarks bar, history, search, and an honest "this site blocks embedding" banner. Deploy the optional proxy in [`proxy/`](proxy/README.md) (a 5-minute Cloudflare Worker) and Edge routes through it automatically so most sites load |
| Outlook | Folders, search, compose, drafts, junk, reply. Mail the bots in the address book (Clippy, Neko, IT Helpdesk, The Boss) and they write back |
| Calendar | Month view, events with colors and 10-minute reminders, agenda in the clock flyout |
| Camera / Voice Recorder | Real webcam with filters; real microphone with a live meter. Photos land in Camera Roll, recordings in Music › Recordings |
| Notepad | Find & replace, word wrap, zoom, tab indent, Ln/Col + word count status bar, dirty-state title |
| Clock | World clocks, stopwatch with laps, timers and alarms that keep running (and ring) with the window closed |
| Paint, Calculator, Terminal, Settings | The classics: Paint has shapes + flood fill and saves PNGs; Terminal has a real command set over the virtual FS (`help`), history (↑/↓) and Tab completion; Settings does themes, wallpapers, accent colors, storage and Reset PC |

**Microsoft Store — with apps you can actually download.** Installing shows a download progress bar, then the app appears in Start, on the desktop, and in your library (persisted). Catalog: Minesweeper (three difficulties, timer, best times), Snake, 2048, Tic-Tac-Toe (minimax AI — it won't lose), **Solitaire**, **Chess** (full rules, alpha-beta engine, three difficulties), **Labyrinth 3D** (a Wolfenstein-style raycaster maze), **Dot Muncher** (four ghosts, power pellets), **Sudoku** (generated puzzles with unique solutions), **Asteroids** (vector rocks, hyperspace), **Tetris** (hold, ghost, hard drop), **Space Invaders** (shields that crumble, a UFO), **Breakout** (infinite levels, armored bricks), **Pong** (vs. a beatable CPU, first to 7), **Flappy Window** (a tiny Windows logo, aggressively unfair), Sticky Notes, MSN Weather, Clock/stopwatch, Tiny Piano (playable, keyboard mapped), Microsoft To Do. Games keep high scores and feed the achievements system. Search the catalog, read (fabricated) ratings & reviews, post your own. All uninstallable from the Store or Settings → Apps.

## Performance notes

- Zero dependencies, ~200 KB of unminified source total; wallpapers and sample photos are inline SVG, so there are no image downloads.
- Windows are plain DOM nodes; only visible UI is rendered, timers are per-open-window and cleaned up on close. Event-bus subscriptions made by an app are scoped to its window (`win.on`) and dropped when it closes.
- Music is scheduled through a single shared WebAudio context with a lookahead scheduler — no audio files to fetch.

Not affiliated with Microsoft — this is a loving fan recreation for fun.
