import unittest
from datetime import datetime

from trip.services.hos_engine import (
    _HosState,
    _process_drive_segment,
    simulate_trip,
)
from trip.services.log_generator import generate_all_logs


def _loc(name: str, lat: float = 0.0, lng: float = 0.0) -> dict:
    return {"lat": lat, "lng": lng, "display_name": name}


def _route(hours: float, miles: float) -> dict:
    return {
        "distance_miles": miles,
        "duration_seconds": hours * 3600,
        "geometry": [[0.0, 0.0], [1.0, 1.0]],
        "steps": [],
    }


def _drive_seg(hours: float, miles: float) -> dict:
    return {
        "type": "DRIVE",
        "event_type": "DRIVE",
        "duration_hours": hours,
        "distance_miles": miles,
        "label": "A \u2192 B",
        "lat": 1.0,
        "lng": 1.0,
    }


def _fresh_state(**overrides) -> _HosState:
    defaults = dict(
        current_time=datetime(2024, 1, 1, 8, 0, 0),
        driving_hours=0.0,
        window_hours=0.0,
        hours_since_break=0.0,
        cycle_hours=0.0,
        window_open=False,
        current_lat=0.0,
        current_lng=0.0,
        current_location_name="Start",
    )
    defaults.update(overrides)
    return _HosState(**defaults)


def _event_types(events):
    return [e.event_type for e in events]


def _by_type(events, kind):
    return [e for e in events if e.event_type == kind]


class HosEngineTests(unittest.TestCase):

    def test_short_trip_no_rests(self):
        events = simulate_trip(
            current_location=_loc("Chicago, IL",      41.8781, -87.6298),
            pickup_location=_loc("Indianapolis, IN",  39.7684, -86.1581),
            dropoff_location=_loc("Columbus, OH",     39.9612, -82.9988),
            route_to_pickup=_route(3.0, 180.0),
            route_to_dropoff=_route(3.0, 175.0),
            fuel_stops_to_pickup=[],
            fuel_stops_to_dropoff=[],
            current_cycle_used=0,
            start_time=datetime(2024, 1, 15, 8, 0, 0),
        )

        rest_types = {"REST_10H", "REST_30", "RESTART_34H"}
        injected = [e for e in events if e.event_type in rest_types]
        self.assertEqual(
            len(injected), 0,
            f"Expected no rest events for a ~6h trip but got: {_event_types(events)}",
        )

    def test_eleven_hour_driving_limit(self):
        state = _fresh_state()
        events = []
        _process_drive_segment(_drive_seg(12.0, 720.0), state, events)

        rest10 = _by_type(events, "REST_10H")
        self.assertEqual(len(rest10), 1,
            f"Expected 1 REST_10H, got: {_event_types(events)}")

        rest10_idx = events.index(rest10[0])
        drive_before = sum(
            e.duration_hours for e in events[:rest10_idx]
            if e.event_type == "DRIVE"
        )
        self.assertAlmostEqual(drive_before, 11.0, delta=0.01,
            msg=f"Expected 11h driving before REST_10H, got {drive_before:.4f}h")

        total_drive = sum(e.duration_hours for e in events if e.event_type == "DRIVE")
        self.assertAlmostEqual(total_drive, 12.0, delta=0.01,
            msg=f"Expected 12h total driving, got {total_drive:.4f}h")

    def test_eight_hour_break_trigger(self):
        state = _fresh_state()
        events = []
        _process_drive_segment(_drive_seg(9.0, 540.0), state, events)

        rest30 = _by_type(events, "REST_30")
        self.assertEqual(len(rest30), 1,
            f"Expected 1 REST_30, got: {_event_types(events)}")
        self.assertEqual(len(_by_type(events, "REST_10H")), 0,
            f"Expected no REST_10H, got: {_event_types(events)}")

        first_drive = _by_type(events, "DRIVE")[0]
        self.assertAlmostEqual(first_drive.duration_hours, 8.0, delta=0.01,
            msg=f"Expected first drive slice ≈ 8h, got {first_drive.duration_hours:.4f}h")

        rest30_idx = events.index(rest30[0])
        self.assertLess(rest30_idx + 1, len(events),
            "No event found after REST_30")
        self.assertEqual(events[rest30_idx + 1].event_type, "DRIVE",
            f"Expected DRIVE after REST_30 but got: {events[rest30_idx + 1].event_type}")

    def test_seventy_hour_cycle_restart(self):
        state = _fresh_state(cycle_hours=68.0)
        events = []
        _process_drive_segment(_drive_seg(4.0, 240.0), state, events)

        restart = _by_type(events, "RESTART_34H")
        self.assertEqual(len(restart), 1,
            f"Expected 1 RESTART_34H, got: {_event_types(events)}")

        first_drive = _by_type(events, "DRIVE")[0]
        self.assertAlmostEqual(first_drive.duration_hours, 2.0, delta=0.01,
            msg=f"Expected first drive slice ≈ 2h, got {first_drive.duration_hours:.4f}h")

        restart_idx = events.index(restart[0])
        post_restart_drives = _by_type(events[restart_idx:], "DRIVE")
        self.assertGreater(len(post_restart_drives), 0,
            "Expected at least one DRIVE event after RESTART_34H")

    def test_fourteen_hour_window_limit(self):
        state = _fresh_state(
            window_hours=5.0,
            window_open=True,
            cycle_hours=5.0,
        )
        events = []
        _process_drive_segment(_drive_seg(10.0, 600.0), state, events)

        rest10 = _by_type(events, "REST_10H")
        self.assertEqual(len(rest10), 1,
            f"Expected 1 REST_10H, got: {_event_types(events)}")

        rest10_idx = events.index(rest10[0])
        drive_before = sum(
            e.duration_hours for e in events[:rest10_idx]
            if e.event_type == "DRIVE"
        )
        self.assertAlmostEqual(drive_before, 8.5, delta=0.01,
            msg=(
                f"Expected 8.5h driving before REST_10H (window-forced), "
                f"got {drive_before:.4f}h. "
                "If ≥ 11h the 11h driving limit triggered instead of the "
                "14h window — window logic is broken."
            ))
        self.assertLess(drive_before, 11.0,
            "Driving before REST_10H must be < 11h to confirm the "
            "14h window (not the driving limit) triggered the rest")

    def test_multi_day_log_splitting(self):
        events = simulate_trip(
            current_location=_loc("Chicago, IL",     41.8781, -87.6298),
            pickup_location=_loc("Kansas City, MO",  39.0997, -94.5786),
            dropoff_location=_loc("Los Angeles, CA", 34.0522, -118.2437),
            route_to_pickup=_route(0.1, 5.0),
            route_to_dropoff=_route(30.0, 1500.0),
            fuel_stops_to_pickup=[],
            fuel_stops_to_dropoff=[],
            current_cycle_used=0,
            start_time=datetime(2024, 1, 15, 20, 0, 0),
        )

        sheets = generate_all_logs(events)
        self.assertGreaterEqual(len(sheets), 2,
            f"Expected >= 2 log sheets for a 30h+ trip, got {len(sheets)}: "
            f"{[s['date'] for s in sheets]}")

        distinct_dates = {s["date"] for s in sheets}
        self.assertGreater(len(distinct_dates), 1,
            f"Expected multiple distinct dates in log sheets, got: {distinct_dates}")

        midnight_spanning = [
            e for e in events
            if e.start_time.date() != e.end_time.date()
        ]
        self.assertGreater(len(midnight_spanning), 0,
            "Expected at least one event that spans midnight (start.date != end.date)")
