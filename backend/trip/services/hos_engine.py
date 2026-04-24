import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional

STATUS_OFF_DUTY      = "Off Duty"
STATUS_SLEEPER_BERTH = "Sleeper Berth"
STATUS_DRIVING       = "Driving"
STATUS_ON_DUTY_ND    = "On Duty (Not Driving)"

_DRIVE_LIMIT_HRS      = 11.0
_WINDOW_LIMIT_HRS     = 14.0
_BREAK_TRIGGER_HRS    = 8.0
_CYCLE_LIMIT_HRS      = 70.0
_REST_10H_HRS         = 10.0
_REST_30MIN_HRS       = 0.5
_RESTART_34H_HRS      = 34.0

_EPS = 1e-6


@dataclass
class TripEvent:
    status: str
    start_time: datetime
    end_time: datetime
    duration_hours: float
    location_name: str
    lat: float
    lng: float
    miles_driven: float = 0.0
    event_type: str = ""        # DRIVE | PICKUP | DROPOFF | FUEL | REST_30 | REST_10H | RESTART_34H


@dataclass
class _HosState:
    current_time: datetime
    driving_hours: float = 0.0
    window_hours: float = 0.0
    hours_since_break: float = 0.0
    cycle_hours: float = 0.0
    window_open: bool = False
    current_lat: float = 0.0
    current_lng: float = 0.0
    current_location_name: str = ""


def _build_raw_segments(
    current_location: dict,
    pickup_location: dict,
    dropoff_location: dict,
    route_to_pickup: dict,
    route_to_dropoff: dict,
    fuel_stops_to_pickup: list,
    fuel_stops_to_dropoff: list,
) -> list:
    segments = []

    _add_drive_segments(
        segments,
        route_to_pickup,
        fuel_stops_to_pickup,
        current_location,
        pickup_location,
    )

    segments.append({
        "type": "ON_DUTY_ND",
        "event_type": "PICKUP",
        "duration_hours": 1.0,
        "distance_miles": 0.0,
        "location_name": pickup_location["display_name"],
        "lat": pickup_location["lat"],
        "lng": pickup_location["lng"],
    })

    _add_drive_segments(
        segments,
        route_to_dropoff,
        fuel_stops_to_dropoff,
        pickup_location,
        dropoff_location,
    )

    segments.append({
        "type": "ON_DUTY_ND",
        "event_type": "DROPOFF",
        "duration_hours": 1.0,
        "distance_miles": 0.0,
        "location_name": dropoff_location["display_name"],
        "lat": dropoff_location["lat"],
        "lng": dropoff_location["lng"],
    })

    return segments


def _add_drive_segments(
    segments: list,
    route: dict,
    fuel_stops: list,
    start_loc: dict,
    end_loc: dict,
) -> None:
    total_miles = route["distance_miles"]
    total_hours = route["duration_seconds"] / 3600.0

    if total_miles <= _EPS or total_hours <= _EPS:
        return

    speed = total_miles / total_hours

    prev_mile = 0.0
    prev_name = start_loc["display_name"]

    for fs in sorted(fuel_stops, key=lambda s: s["at_mile"]):
        stop_mile = fs["at_mile"]
        seg_miles = stop_mile - prev_mile
        if seg_miles <= _EPS:
            continue

        seg_hours = seg_miles / speed
        dest_name = f"Fuel Stop (~{stop_mile:.0f} mi)"

        segments.append({
            "type": "DRIVE",
            "event_type": "DRIVE",
            "duration_hours": seg_hours,
            "distance_miles": seg_miles,
            "label": f"{prev_name} → {dest_name}",
            "lat": fs["lat"],
            "lng": fs["lng"],
        })

        segments.append({
            "type": "ON_DUTY_ND",
            "event_type": "FUEL",
            "duration_hours": 0.5,
            "distance_miles": 0.0,
            "location_name": dest_name,
            "lat": fs["lat"],
            "lng": fs["lng"],
        })

        prev_mile = stop_mile
        prev_name = dest_name

    remaining_miles = total_miles - prev_mile
    if remaining_miles > _EPS:
        segments.append({
            "type": "DRIVE",
            "event_type": "DRIVE",
            "duration_hours": remaining_miles / speed,
            "distance_miles": remaining_miles,
            "label": f"{prev_name} → {end_loc['display_name']}",
            "lat": end_loc["lat"],
            "lng": end_loc["lng"],
        })


def _inject_30min_break(state: _HosState, events: list) -> None:
    start = state.current_time
    end = start + timedelta(hours=_REST_30MIN_HRS)
    events.append(TripEvent(
        status=STATUS_OFF_DUTY,
        start_time=start,
        end_time=end,
        duration_hours=_REST_30MIN_HRS,
        location_name=state.current_location_name,
        lat=state.current_lat,
        lng=state.current_lng,
        event_type="REST_30",
    ))
    state.current_time = end
    state.hours_since_break = 0.0
    # window_hours advances (break counts against the 14h window, not an extension)
    state.window_hours += _REST_30MIN_HRS


def _inject_10h_rest(state: _HosState, events: list) -> None:
    start = state.current_time
    end = start + timedelta(hours=_REST_10H_HRS)
    events.append(TripEvent(
        status=STATUS_SLEEPER_BERTH,
        start_time=start,
        end_time=end,
        duration_hours=_REST_10H_HRS,
        location_name=state.current_location_name,
        lat=state.current_lat,
        lng=state.current_lng,
        event_type="REST_10H",
    ))
    state.current_time = end
    state.driving_hours = 0.0
    state.window_hours = 0.0
    state.hours_since_break = 0.0
    state.window_open = False


def _inject_34h_restart(state: _HosState, events: list) -> None:
    start = state.current_time
    end = start + timedelta(hours=_RESTART_34H_HRS)
    events.append(TripEvent(
        status=STATUS_OFF_DUTY,
        start_time=start,
        end_time=end,
        duration_hours=_RESTART_34H_HRS,
        location_name=state.current_location_name,
        lat=state.current_lat,
        lng=state.current_lng,
        event_type="RESTART_34H",
    ))
    state.current_time = end
    state.cycle_hours = 0.0
    state.driving_hours = 0.0
    state.window_hours = 0.0
    state.hours_since_break = 0.0
    state.window_open = False


def _process_drive_segment(seg: dict, state: _HosState, events: list) -> None:
    total_seg_hours = seg["duration_hours"]
    total_seg_miles = seg["distance_miles"]
    remaining_hours = total_seg_hours

    speed = (total_seg_miles / total_seg_hours) if total_seg_hours > _EPS else 0.0

    dest_lat = seg["lat"]
    dest_lng = seg["lng"]
    label = seg["label"]

    # Safety guard against infinite loops (shouldn't happen with correct logic)
    max_iterations = 200
    iteration = 0

    while remaining_hours > _EPS:
        iteration += 1
        if iteration > max_iterations:
            break  # Safety net

        if not state.window_open:
            state.window_open = True

        if state.cycle_hours >= _CYCLE_LIMIT_HRS - _EPS:
            _inject_34h_restart(state, events)
            continue

        if (state.driving_hours >= _DRIVE_LIMIT_HRS - _EPS or
                state.window_hours >= _WINDOW_LIMIT_HRS - _EPS):
            _inject_10h_rest(state, events)
            continue

        if state.hours_since_break >= _BREAK_TRIGGER_HRS - _EPS:
            _inject_30min_break(state, events)
            continue

        cap_drive  = _DRIVE_LIMIT_HRS  - state.driving_hours
        cap_window = _WINDOW_LIMIT_HRS - state.window_hours
        cap_break  = _BREAK_TRIGGER_HRS - state.hours_since_break
        cap_cycle  = _CYCLE_LIMIT_HRS  - state.cycle_hours

        can_drive = min(cap_drive, cap_window, cap_break, cap_cycle, remaining_hours)

        if can_drive <= _EPS:
            continue

        slice_miles = speed * can_drive
        slice_start = state.current_time
        slice_end   = slice_start + timedelta(hours=can_drive)

        consumed_fraction = 1.0 - (remaining_hours - can_drive) / total_seg_hours if total_seg_hours > _EPS else 1.0
        if remaining_hours - can_drive <= _EPS:
            slice_lat = dest_lat
            slice_lng = dest_lng
            slice_label = label
        else:
            start_lat = state.current_lat
            start_lng = state.current_lng
            slice_lat = start_lat + consumed_fraction * (dest_lat - start_lat)
            slice_lng = start_lng + consumed_fraction * (dest_lng - start_lng)
            slice_label = label + f" [partial {can_drive:.2f}h]"

        events.append(TripEvent(
            status=STATUS_DRIVING,
            start_time=slice_start,
            end_time=slice_end,
            duration_hours=round(can_drive, 4),
            location_name=slice_label,
            lat=slice_lat,
            lng=slice_lng,
            miles_driven=round(slice_miles, 2),
            event_type="DRIVE",
        ))

        state.current_time = slice_end
        state.current_lat = slice_lat
        state.current_lng = slice_lng
        state.current_location_name = slice_label
        state.driving_hours     += can_drive
        state.window_hours      += can_drive
        state.hours_since_break += can_drive
        state.cycle_hours       += can_drive
        remaining_hours         -= can_drive


def _process_on_duty_nd_segment(seg: dict, state: _HosState, events: list) -> None:
    dur = seg["duration_hours"]

    if not state.window_open:
        state.window_open = True

    if state.cycle_hours >= _CYCLE_LIMIT_HRS - _EPS:
        _inject_34h_restart(state, events)

    start = state.current_time
    end = start + timedelta(hours=dur)

    events.append(TripEvent(
        status=STATUS_ON_DUTY_ND,
        start_time=start,
        end_time=end,
        duration_hours=dur,
        location_name=seg["location_name"],
        lat=seg["lat"],
        lng=seg["lng"],
        miles_driven=0.0,
        event_type=seg["event_type"],
    ))

    state.current_time = end
    state.current_lat = seg["lat"]
    state.current_lng = seg["lng"]
    state.current_location_name = seg["location_name"]
    # ON_DUTY_ND advances window and cycle clocks, but NOT driving or break clocks
    state.window_hours += dur
    state.cycle_hours  += dur


def _round_up_to_next_hour(dt: datetime) -> datetime:
    """Round datetime up to the next full hour."""
    if dt.minute == 0 and dt.second == 0 and dt.microsecond == 0:
        return dt
    return dt.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)


def simulate_trip(
    current_location: dict,
    pickup_location: dict,
    dropoff_location: dict,
    route_to_pickup: dict,
    route_to_dropoff: dict,
    fuel_stops_to_pickup: list,
    fuel_stops_to_dropoff: list,
    current_cycle_used: float,
    start_time: Optional[datetime] = None,
) -> List[TripEvent]:
    if start_time is None:
        start_time = _round_up_to_next_hour(datetime.now())

    state = _HosState(
        current_time=start_time,
        cycle_hours=float(current_cycle_used),
        current_lat=current_location["lat"],
        current_lng=current_location["lng"],
        current_location_name=current_location["display_name"],
    )

    raw_segments = _build_raw_segments(
        current_location,
        pickup_location,
        dropoff_location,
        route_to_pickup,
        route_to_dropoff,
        fuel_stops_to_pickup,
        fuel_stops_to_dropoff,
    )

    events: List[TripEvent] = []
    for seg in raw_segments:
        if seg["type"] == "DRIVE":
            _process_drive_segment(seg, state, events)
        elif seg["type"] == "ON_DUTY_ND":
            _process_on_duty_nd_segment(seg, state, events)

    return events

