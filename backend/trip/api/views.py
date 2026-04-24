import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import TripInputSerializer
from trip.services.routing import geocode_address, get_route, get_fuel_stop_waypoints, autocomplete_address
from trip.services.hos_engine import simulate_trip
from trip.services.log_generator import generate_all_logs

logger = logging.getLogger(__name__)


class AddressAutocompleteView(APIView):

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if len(query) < 2:
            return Response([], status=status.HTTP_200_OK)
        try:
            suggestions = autocomplete_address(query)
            return Response(suggestions, status=status.HTTP_200_OK)
        except RuntimeError as exc:
            logger.warning("Autocomplete API error: %s", exc)
            return Response([], status=status.HTTP_200_OK)


_STOP_EVENT_TYPES = {"PICKUP", "DROPOFF", "FUEL", "REST_30", "REST_10H", "RESTART_34H"}


class TripPlanView(APIView):

    def post(self, request):

        serializer = TripInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        current_location_str  = data["current_location"]
        pickup_location_str   = data["pickup_location"]
        dropoff_location_str  = data["dropoff_location"]
        current_cycle_used    = data["current_cycle_used"]


        try:
            current_geo  = geocode_address(current_location_str)
            pickup_geo   = geocode_address(pickup_location_str)
            dropoff_geo  = geocode_address(dropoff_location_str)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as exc:
            logger.error("Geocoding API error: %s", exc)
            return Response(
                {"error": "Geocoding service unavailable. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


        try:
            route_to_pickup  = get_route(current_geo,  pickup_geo)
            route_to_dropoff = get_route(pickup_geo,   dropoff_geo)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except RuntimeError as exc:
            logger.error("Routing API error: %s", exc)
            return Response(
                {"error": "Routing service unavailable. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


        fuel_stops_to_pickup  = get_fuel_stop_waypoints(route_to_pickup["geometry"])
        fuel_stops_to_dropoff = get_fuel_stop_waypoints(route_to_dropoff["geometry"])


        try:
            events = simulate_trip(
                current_location=current_geo,
                pickup_location=pickup_geo,
                dropoff_location=dropoff_geo,
                route_to_pickup=route_to_pickup,
                route_to_dropoff=route_to_dropoff,
                fuel_stops_to_pickup=fuel_stops_to_pickup,
                fuel_stops_to_dropoff=fuel_stops_to_dropoff,
                current_cycle_used=current_cycle_used,
            )
        except Exception as exc:
            logger.exception("HOS simulation failed: %s", exc)
            return Response(
                {"error": "Trip simulation error. Please contact support."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            log_sheets = generate_all_logs(events)
        except Exception as exc:
            logger.exception("Log generation failed: %s", exc)
            return Response(
                {"error": "Log sheet generation error. Please contact support."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


        total_distance = (
            route_to_pickup["distance_miles"] + route_to_dropoff["distance_miles"]
        )
        total_duration_hours = (
            route_to_pickup["duration_seconds"] + route_to_dropoff["duration_seconds"]
        ) / 3600.0

        events_serialized = [
            {
                "status":         ev.status,
                "event_type":     ev.event_type,
                "start_time":     ev.start_time.isoformat(),
                "end_time":       ev.end_time.isoformat(),
                "duration_hours": round(ev.duration_hours, 4),
                "location_name":  ev.location_name,
                "lat":            ev.lat,
                "lng":            ev.lng,
                "miles_driven":   round(ev.miles_driven, 2),
            }
            for ev in events
        ]

        stops = [
            {
                "type":           ev.event_type,
                "location_name":  ev.location_name,
                "lat":            ev.lat,
                "lng":            ev.lng,
                "duration_hours": round(ev.duration_hours, 4),
                "arrival_time":   ev.start_time.isoformat(),
            }
            for ev in events
            if ev.event_type in _STOP_EVENT_TYPES
        ]

        return Response(
            {
                "total_distance_miles": round(total_distance, 2),
                "total_duration_hours": round(total_duration_hours, 2),
                "route_to_pickup": {
                    "distance_miles": round(route_to_pickup["distance_miles"], 2),
                    "duration_seconds": route_to_pickup["duration_seconds"],
                    "geometry": route_to_pickup["geometry"],
                },
                "route_to_dropoff": {
                    "distance_miles": round(route_to_dropoff["distance_miles"], 2),
                    "duration_seconds": route_to_dropoff["duration_seconds"],
                    "geometry": route_to_dropoff["geometry"],
                },
                "current_location": current_geo,
                "pickup_location":  pickup_geo,
                "dropoff_location": dropoff_geo,
                "stops":       stops,
                "events":      events_serialized,
                "log_sheets":  log_sheets,
            },
            status=status.HTTP_200_OK,
        )
