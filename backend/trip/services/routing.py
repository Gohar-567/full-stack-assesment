import math
import os
import requests

ORS_BASE = "https://api.openrouteservice.org"
_TIMEOUT = 15


def _api_key() -> str:
    key = os.getenv("ORS_API_KEY", "")
    if not key:
        raise RuntimeError(
            "ORS_API_KEY is not set. Add it to backend/.env and restart the server."
        )
    return key


def haversine_miles(coord1: list, coord2: list) -> float:
    """Returns the great-circle distance in miles between two [lat, lng] points."""
    R = 3958.8  # Earth radius in miles
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def geocode_address(address: str) -> dict:
    url = f"{ORS_BASE}/geocode/search"
    params = {
        "api_key": _api_key(),
        "text": address,
        "size": 1,
        # Bias results toward the United States (FMCSA = US drivers)
        "boundary.country": "US",
    }

    resp = requests.get(url, params=params, timeout=_TIMEOUT)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Geocoding API error {resp.status_code}: {resp.text[:200]}"
        )

    data = resp.json()
    features = data.get("features", [])
    if not features:
        # Retry without country boundary in case the address is near a border
        params.pop("boundary.country")
        resp = requests.get(url, params=params, timeout=_TIMEOUT)
        features = resp.json().get("features", [])

    if not features:
        raise ValueError(f"Could not geocode address: '{address}'")

    # GeoJSON coordinates are [lng, lat] — swap to [lat, lng] for our convention
    coords = features[0]["geometry"]["coordinates"]
    display_name = features[0]["properties"].get("label", address)

    return {
        "lat": coords[1],
        "lng": coords[0],
        "display_name": display_name,
    }


def autocomplete_address(query: str, limit: int = 6) -> list:
    if not query or len(query.strip()) < 2:
        return []

    url = f"{ORS_BASE}/geocode/autocomplete"
    params = {
        "api_key":          _api_key(),
        "text":             query,
        "size":             limit,
        "boundary.country": "US",
    }
    resp = requests.get(url, params=params, timeout=_TIMEOUT)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Autocomplete API error {resp.status_code}: {resp.text[:200]}"
        )
    results, seen = [], set()
    for feat in resp.json().get("features", []):
        label = feat["properties"].get("label", "")
        if not label or label in seen:
            continue
        seen.add(label)
        coords = feat["geometry"]["coordinates"]  # [lng, lat]
        results.append({"display_name": label, "lat": coords[1], "lng": coords[0]})
    return results


def get_route(origin_coords: dict, destination_coords: dict) -> dict:
    url = f"{ORS_BASE}/v2/directions/driving-hgv"
    headers = {
        "Authorization": _api_key(),
        "Content-Type": "application/json",
    }
    # ORS expects [lng, lat] order
    body = {
        "coordinates": [
            [origin_coords["lng"], origin_coords["lat"]],
            [destination_coords["lng"], destination_coords["lat"]],
        ],
        "instructions": True,
        "units": "mi",
        "geometry_simplify": False,
    }

    resp = requests.post(url, json=body, headers=headers, timeout=_TIMEOUT)
    if resp.status_code != 200:
        raise RuntimeError(
            f"Routing API error {resp.status_code}: {resp.text[:200]}"
        )

    data = resp.json()
    routes = data.get("routes", [])
    if not routes:
        raise RuntimeError("No route found between the given locations.")

    route = routes[0]
    summary = route["summary"]

    raw_geometry = route["geometry"]
    waypoints = _decode_polyline(raw_geometry)

    # Parse turn-by-turn steps from the first segment
    steps = []
    for segment in route.get("segments", []):
        for step in segment.get("steps", []):
            steps.append({
                "instruction": step.get("instruction", ""),
                "distance_miles": round(step.get("distance", 0), 2),
            })

    return {
        "distance_miles": round(summary["distance"], 2),
        "duration_seconds": round(summary["duration"], 1),
        "geometry": waypoints,
        "steps": steps,
    }


def _decode_polyline(encoded: str) -> list:
    """Decode an ORS/Google-format encoded polyline string into [[lat, lng], ...]."""
    result = []
    index = 0
    lat = 0
    lng = 0
    length = len(encoded)

    while index < length:
        b, shift, value = 0, 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            value |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(value >> 1) if (value & 1) else (value >> 1)
        lat += dlat

        b, shift, value = 0, 0, 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            value |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(value >> 1) if (value & 1) else (value >> 1)
        lng += dlng

        result.append([lat / 1e5, lng / 1e5])

    return result


def get_fuel_stop_waypoints(
    geometry: list, interval_miles: float = 1000.0
) -> list:
    if len(geometry) < 2:
        return []

    fuel_stops = []
    cumulative_miles = 0.0
    next_stop_at = interval_miles

    for i in range(1, len(geometry)):
        segment_miles = haversine_miles(geometry[i - 1], geometry[i])
        cumulative_miles += segment_miles

        # Check if one or more fuel stop thresholds were crossed in this segment
        while cumulative_miles >= next_stop_at:
            overshoot = cumulative_miles - next_stop_at
            fraction = 1.0 - (overshoot / segment_miles) if segment_miles > 0 else 1.0
            fraction = max(0.0, min(1.0, fraction))

            p1 = geometry[i - 1]
            p2 = geometry[i]
            interp_lat = p1[0] + fraction * (p2[0] - p1[0])
            interp_lng = p1[1] + fraction * (p2[1] - p1[1])

            fuel_stops.append({
                "lat": round(interp_lat, 6),
                "lng": round(interp_lng, 6),
                "at_mile": round(next_stop_at, 1),
            })
            next_stop_at += interval_miles

    return fuel_stops

