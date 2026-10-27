# Model sources

These editable Blender scenes are kept outside the published website.

| File | Contents |
| --- | --- |
| `office-room.blend` | The current office room and workstation layout |
| `desk-scene.blend` | The main desk assembly |
| `office-1984.blend` | The original office furniture, keyboard and mouse |
| `macintosh-128k.blend` | The Macintosh model |

The browser loads the exported GLB files in `dist/immersive/models/`. Their textures are embedded in the GLBs. Publishing the website does not require Blender or Python.

Run `python model-source/showcase_screen.py` from the repository root to rebuild the monitor texture. This optional script requires Pillow and uses the fonts bundled in `dist/fonts/`.
