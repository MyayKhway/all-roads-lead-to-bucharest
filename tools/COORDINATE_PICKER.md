# Romania map coordinate picker

`coordinate_picker.py` records the center of each city marker in original-image
pixel coordinates. The image may be scaled, panned, or zoomed in the Matplotlib
window without changing the recorded coordinate system.

## Setup

Install Python 3.10 or newer, then install the two dependencies:

```powershell
python -m pip install -r tools/coordinate_picker_requirements.txt
```

Equivalent direct installation:

```powershell
python -m pip install matplotlib pillow
```

Place the original map beside the script as:

```text
tools/romania_map.png
```

Alternatively, edit `IMAGE_PATH` near the top of `coordinate_picker.py` or pass
an image path when starting the tool.

## Run

From the repository root:

```powershell
python tools/coordinate_picker.py
```

Or from the `tools` directory:

```powershell
python coordinate_picker.py
```

To use a different image without editing the script:

```powershell
python tools/coordinate_picker.py "C:\path\to\romania_map.png"
```

Relative command-line image paths are resolved from the `tools` directory.

## Controls

| Input | Action |
| --- | --- |
| Left click | Record the center of the city named above the image |
| `U` or Backspace | Undo the most recent city |
| `R` | Reset all selections |
| `Q` or Escape | Save recovery progress and close |

Every click is printed in the terminal and drawn over the displayed map. After
all cities are selected, the script writes these files beside itself:

- `city_coordinates.csv`
- `city_coordinates.py`
- `map_with_coordinates.png`

Completed output files are written only after all cities are selected. Each
file is written to a temporary file and atomically replaced, so an interrupted
save cannot leave a partial output. Unfinished selections are stored separately
in `.coordinate_picker_progress.json` and restored the next time the same image
and city list are opened.

## Coordinate convention

- The original image's top-left pixel is `(0, 0)`.
- `x` increases to the right.
- `y` increases downward.
- Coordinates are rounded to the nearest original-image pixel.
- The source image is never resized for calculations.

Use the same unmodified source image for the entire measurement session.
