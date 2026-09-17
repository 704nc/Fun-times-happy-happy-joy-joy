# Tests

End-to-end smoke suites that drive the real desktop in headless Chromium: boot, unlock, launch every app,
play the games, exercise the Office apps, Explorer, Edge, Nearby Share across two tabs, and a phone-size sweep.

```bash
cd tests
npm install                          # the playwright package
npx playwright install chromium      # the browser (once)
node run.mjs                         # serves the repo on :8123 and runs every suite
node run.mjs office                  # only suites whose file name contains "office"
BASE=https://your.site node run.mjs  # run against a deployed copy
OUT=/tmp/shots node run.mjs          # where suites drop screenshots
```

Each suite prints what it checked and ends with `ERRORS: none` when no page errors or console errors occurred.
Network calls to Open-Meteo are stubbed or aborted, so the suites run offline.
