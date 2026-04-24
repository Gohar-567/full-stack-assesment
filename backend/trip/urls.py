from django.urls import path
from trip.api.views import TripPlanView, AddressAutocompleteView

urlpatterns = [
    path('plan',         TripPlanView.as_view(),            name='trip-plan'),
    path('autocomplete', AddressAutocompleteView.as_view(), name='trip-autocomplete'),
]
