

# PsychonautWiki Journal

PsychonautWiki Journal makes PsychonautWiki's info on psychoactive substances easily accessible. Users can quickly find dosage, tolerance, duration and dangerous interaction info offline.

Users can also log their ingestions, make notes and get an overview of their experiences.

<a href='https://apps.apple.com/ch/app/psychonautwiki-journal/id1582059415'>
<img alt='Download on the App Store' src='README Assets/badge-appstore.svg' width='25%'/>
</a>

**Triple tap on the closed eye in settings to see all PsychonautWiki substances.**


<p>
<img src="README Assets/presentation.png" width="100%">
</p>

## Windows + iPhone without a Mac

This fork includes a GitHub Actions pipeline that compiles the native Swift project on a GitHub macOS runner and publishes a stable SideStore build.

You do **not** need Xcode on the Windows PC and you do not need to unpack or manually sign the IPA. Once SideStore is configured on the iPhone, it can download the current build from the stable release URL and sign it locally.

See **[docs/SIDESTORE_WINDOWS.md](docs/SIDESTORE_WINDOWS.md)** for the complete Windows/SideStore flow.

The release workflow is in **`.github/workflows/sidestore-release.yml`**.

## Installation and Building

The project is completely open source. For native development on macOS, open `PsychonautWiki Journal.xcodeproj` with a current Xcode version. Dependencies are managed with Swift Package Manager.

For Windows-based personal builds, use the GitHub Actions + SideStore route documented above.

## License
```
This file is part of PsychonautWiki Journal, but the license is free!

PsychonautWiki Journal is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation!
```
