# PsychonautWiki Journal Web — PWA reconstruction

This directory is a static, offline-first web reconstruction of the PsychonautWiki Journal workflow. It does not attempt to run SwiftUI in a browser; it recreates the relevant interface and data behavior with web standards so it can be installed on iPhone as a PWA.

## Implemented

- iOS-style Journal, Search, Timeline, Stats and Settings tabs;
- PsychonautWiki substance snapshot loaded from the repository and bundled into the Pages deployment;
- search by substance/alias and detailed substance pages;
- doses, durations, tolerance and interaction display;
- experiences and ingestion logging;
- timeline drawing using onset → come-up → peak → offset;
- rich custom substances with singular/plural units, notes, color, subcomponents, dose/duration and tolerance;
- seeded Vortioxetine and Pramipexole custom entries;
- local IndexedDB persistence;
- Journal JSON import/export using millisecond Unix timestamps and uppercase administration routes;
- offline service worker and installable web manifest.

## iPhone

After publishing with GitHub Pages, open the site in Safari and use **Share → Add to Home Screen**. Data is stored locally on the device/browser. After the initial cache, the shell and substance catalog work offline.

## Source-version note

The supplied source archive contains an older Swift custom-substance editor (name/description/units), while the current iPhone screenshot shows newer subcomponents, dose/duration, and tolerance controls. This PWA implements the richer screenshot model while keeping the native JSON fields `name`, `units`, and `description`.

## License

Keep the reconstruction GPL-compatible with the source project. PsychonautWiki content retains its upstream licensing and attribution requirements.
