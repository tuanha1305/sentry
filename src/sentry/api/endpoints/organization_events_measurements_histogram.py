from __future__ import absolute_import

import sentry_sdk

from rest_framework.response import Response
from rest_framework.exceptions import ParseError

from sentry.api.bases import OrganizationEventsV2EndpointBase, NoProjects
from sentry.snuba import discover


class OrganizationEventsMeasurementsHistogramEndpoint(OrganizationEventsV2EndpointBase):
    def get(self, request, organization):
        if not self.has_feature(organization, request):
            return Response(status=404)

        try:
            params = self.get_snuba_params(request, organization)
        except NoProjects:
            return Response([])

        measurements = request.GET.getlist("measurement")
        if not measurements:
            raise ParseError(detail=u"Missing value for parameter measurements.")

        with sentry_sdk.start_span(
            op="discover.endpoint", description="measurements_histogram"
        ) as span:
            span.set_tag("organization", organization)

            results = discover.measurements_histogram_query(
                measurements,
                request.GET.get("query"),
                params,
                self.get_int_param(request, "num_buckets"),
                self.get_int_param(request, "min", allow_none=True),
                self.get_int_param(request, "max", allow_none=True),
                self.get_int_param(request, "precision", default=0),
                "api.organization-events-measurements-histogram",
            )

            results_with_meta = self.handle_results_with_meta(
                request, organization, params["project_id"], results
            )

            return Response(results_with_meta)

    def get_int_param(self, request, param, allow_none=False, default=None):
        raw_value = request.GET.get(param, default)
        try:
            if raw_value is not None:
                value = int(raw_value)
            elif not allow_none:
                raise ParseError(detail=u"Missing value for parameter {}.".format(param))
            else:
                value = None
            return value
        except ValueError:
            raise ParseError(
                detail=u"Invalid value for parameter {} specified: {}".format(param, raw_value)
            )
