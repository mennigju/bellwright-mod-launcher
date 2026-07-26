# Game logo sources

The current bundled icons were extracted from the installed game executables at
256x256 with the user's explicit request to show the official game icons:

- `bellwright-icon.png`: `BellwrightGame-Win64-Shipping.exe`
- `warhammer3-icon.png`: `Warhammer3.exe`

The renderer keeps a text fallback for missing or unreadable assets. Bellwright's
executable icon has an opaque black background, so the renderer uses screen
blending to make that background visually transparent on the launcher surface.
No icon was generated or downloaded from an unofficial source.
