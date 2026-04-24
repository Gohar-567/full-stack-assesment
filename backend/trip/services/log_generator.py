import base64
import io
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import List

from PIL import Image, ImageDraw, ImageFont

IMG_WIDTH  = 1400
IMG_HEIGHT = 500

GRID_LEFT   = 170
GRID_RIGHT  = 1360
GRID_TOP    = 90       # top of the first status row
GRID_BOTTOM = 340      # bottom of the last status row

ROW_Y = {
    "Off Duty":              110,
    "Sleeper Berth":         177,
    "Driving":               244,
    "On Duty (Not Driving)": 311,
}

ROW_HEIGHT = 55

COL_BACKGROUND  = (255, 255, 255)
COL_GRID_OUTER  = (0,   0,   0)
COL_GRID_HOUR   = (150, 150, 150)
COL_GRID_HALF   = (210, 210, 210)
COL_ROW_DIVIDER = (80,  80,  80)
COL_LABEL_BG    = (240, 240, 240)
COL_HEADER_BG   = (30,  60,  120)
COL_HEADER_TEXT = (255, 255, 255)

STATUS_COLOUR = {
    "Off Duty":              (100, 149, 237),
    "Sleeper Berth":         (72,  61,  139),
    "Driving":               (34,  139, 34),
    "On Duty (Not Driving)": (210, 105, 30),
}

LINE_WIDTH = 5  # px — thickness of the status line

LABEL_Y_TOP = GRID_BOTTOM + 10


def _get_font(size: int, bold: bool = False):
    """Return a PIL font, falling back to the built-in bitmap font if needed."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except (IOError, OSError):
            continue
    return ImageFont.load_default()


def _time_to_x(hour_decimal: float) -> int:
    """Map a decimal hour in [0, 24] to an X pixel position within the grid."""
    fraction = max(0.0, min(1.0, hour_decimal / 24.0))
    return int(GRID_LEFT + fraction * (GRID_RIGHT - GRID_LEFT))


def _dt_to_hour_decimal(dt: datetime, day: date) -> float:
    """
    Return the decimal hour (0.0–24.0) of a datetime relative to midnight
    of `day`.  Values outside [0, 24] are clamped.
    """
    midnight = datetime(day.year, day.month, day.day, 0, 0, 0)
    delta = (dt - midnight).total_seconds() / 3600.0
    return max(0.0, min(24.0, delta))


def _draw_blank_grid(draw: ImageDraw.Draw, day: date, font_sm, font_md, font_lg):
    draw.rectangle([0, 0, IMG_WIDTH - 1, IMG_HEIGHT - 1], fill=COL_BACKGROUND)

    draw.rectangle([0, 0, IMG_WIDTH - 1, GRID_TOP - 10], fill=COL_HEADER_BG)
    draw.text((12, 8),  "ELD DAILY LOG",          font=font_lg, fill=COL_HEADER_TEXT)
    draw.text((12, 38), "Driver Hours of Service", font=font_sm, fill=(200, 220, 255))
    date_str = day.strftime("%A, %B %d, %Y")
    try:
        tw = draw.textlength(date_str, font=font_md)
    except AttributeError:
        tw = len(date_str) * 8
    draw.text((IMG_WIDTH - tw - 12, 20), date_str, font=font_md, fill=COL_HEADER_TEXT)

    draw.rectangle([0, GRID_TOP - 8, GRID_LEFT - 1, GRID_BOTTOM + 2], fill=COL_LABEL_BG)

    row_labels = [
        ("Off Duty",              "OFF\nDUTY"),
        ("Sleeper Berth",         "SLEEPER\nBERTH"),
        ("Driving",               "DRIVING"),
        ("On Duty (Not Driving)", "ON DUTY\n(NOT DRV)"),
    ]
    for status, label_text in row_labels:
        cy = ROW_Y[status]
        top    = cy - ROW_HEIGHT // 2
        bottom = cy + ROW_HEIGHT // 2

        # Alternate row shading
        idx = list(ROW_Y.keys()).index(status)
        bg = (248, 248, 248) if idx % 2 == 0 else (238, 245, 255)
        draw.rectangle([GRID_LEFT, top, GRID_RIGHT, bottom], fill=bg)

        draw.line([0, top, IMG_WIDTH, top], fill=COL_ROW_DIVIDER, width=1)

        lines = label_text.split("\n")
        line_h = 14
        total_h = len(lines) * line_h
        y_start = cy - total_h // 2
        for i, line in enumerate(lines):
            draw.text((6, y_start + i * line_h), line, font=font_sm, fill=(40, 40, 40))

        swatch_x = GRID_LEFT - 18
        draw.rectangle([swatch_x, cy - 6, swatch_x + 12, cy + 6],
                        fill=STATUS_COLOUR[status])

    draw.line([0, GRID_BOTTOM, IMG_WIDTH, GRID_BOTTOM], fill=COL_ROW_DIVIDER, width=1)


    hour_labels = (
        ["M"] +
        [str(h) for h in range(1, 12)] +
        ["N"] +
        [str(h) for h in range(1, 12)] +
        ["M"]
    )

    for h in range(25):
        x = _time_to_x(h)
        # Full-hour line
        draw.line([x, GRID_TOP - 8, x, GRID_BOTTOM], fill=COL_GRID_HOUR, width=1)
        # Label above grid
        lbl = hour_labels[h]
        try:
            lw = draw.textlength(lbl, font=font_sm)
        except AttributeError:
            lw = len(lbl) * 7
        draw.text((x - lw // 2, GRID_TOP - 22), lbl, font=font_sm, fill=(60, 60, 60))

        # Half-hour tick (between full hours)
        if h < 24:
            xh = _time_to_x(h + 0.5)
            draw.line([xh, GRID_TOP - 4, xh, GRID_BOTTOM], fill=COL_GRID_HALF, width=1)

    draw.rectangle(
        [GRID_LEFT, GRID_TOP - 8, GRID_RIGHT, GRID_BOTTOM],
        outline=COL_GRID_OUTER,
        width=2,
    )


def _clip_event_to_day(event, day: date):
    """
    Return (clipped_start, clipped_end) datetimes for `event` clipped to `day`.
    Returns None if the event does not overlap with `day`.
    """
    midnight_start = datetime(day.year, day.month, day.day, 0, 0, 0)
    midnight_end   = midnight_start + timedelta(days=1)

    clipped_start = max(event.start_time, midnight_start)
    clipped_end   = min(event.end_time,   midnight_end)

    if clipped_start >= clipped_end:
        return None
    return clipped_start, clipped_end


def generate_log_image(day: date, day_events: list) -> str:
    img  = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), COL_BACKGROUND)
    draw = ImageDraw.Draw(img)

    font_sm = _get_font(11)
    font_md = _get_font(14)
    font_lg = _get_font(20, bold=True)

    _draw_blank_grid(draw, day, font_sm, font_md, font_lg)

    sorted_events = sorted(day_events, key=lambda e: e.start_time)

    prev_x2 = None
    prev_y  = None
    annotation_x_used = set()  # avoid crowding annotations

    for event in sorted_events:
        clipped = _clip_event_to_day(event, day)
        if clipped is None:
            continue

        clipped_start, clipped_end = clipped
        h1 = _dt_to_hour_decimal(clipped_start, day)
        h2 = _dt_to_hour_decimal(clipped_end,   day)

        x1 = _time_to_x(h1)
        x2 = _time_to_x(h2)
        y  = ROW_Y.get(event.status, ROW_Y["Off Duty"])
        colour = STATUS_COLOUR.get(event.status, (128, 128, 128))

        # Vertical connecting line from previous event's row
        if prev_x2 is not None and prev_y is not None and prev_y != y:
            draw.line([prev_x2, prev_y, prev_x2, y], fill=(0, 0, 0), width=LINE_WIDTH)

        # Horizontal status line
        if x2 > x1:
            draw.line([x1, y, x2, y], fill=colour, width=LINE_WIDTH)

            # End-cap dots
            r = LINE_WIDTH + 1
            draw.ellipse([x1 - r, y - r, x1 + r, y + r], fill=colour)
            draw.ellipse([x2 - r, y - r, x2 + r, y + r], fill=colour)

        prev_x2 = x2
        prev_y  = y

        label = event.location_name
        if len(label) > 28:
            label = label[:25] + "…"

        annot_x = x1
        too_close = any(abs(annot_x - ax) < 60 for ax in annotation_x_used)
        if not too_close and x2 - x1 > 5:
            annotation_x_used.add(annot_x)
            draw.line([annot_x, GRID_BOTTOM, annot_x, GRID_BOTTOM + 6],
                      fill=(80, 80, 80), width=1)
            txt_img = Image.new("RGBA", (120, 14), (255, 255, 255, 0))
            txt_draw = ImageDraw.Draw(txt_img)
            txt_draw.text((0, 0), label, font=font_sm, fill=(50, 50, 50))
            rotated = txt_img.rotate(30, expand=True)
            img.paste(rotated, (annot_x, LABEL_Y_TOP), rotated)

    legend_y = IMG_HEIGHT - 28
    legend_items = list(STATUS_COLOUR.items())
    spacing = IMG_WIDTH // (len(legend_items) + 1)
    for i, (status, colour) in enumerate(legend_items):
        lx = spacing * (i + 1)
        draw.rectangle([lx - 10, legend_y - 6, lx + 2, legend_y + 6], fill=colour)
        draw.text((lx + 6, legend_y - 7), status, font=font_sm, fill=(40, 40, 40))

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def generate_all_logs(events: list) -> list:
    if not events:
        return []

    days_set = set()
    for ev in events:
        current_day = ev.start_time.date()
        end_day     = ev.end_time.date()
        while current_day <= end_day:
            days_set.add(current_day)
            current_day += timedelta(days=1)

    result = []
    for day in sorted(days_set):
        # All events that overlap with this day
        day_events = [
            ev for ev in events
            if ev.start_time.date() <= day <= ev.end_time.date()
        ]
        image_b64 = generate_log_image(day, day_events)
        result.append({
            "date": day.strftime("%Y-%m-%d"),
            "image_base64": image_b64,
        })

    return result

