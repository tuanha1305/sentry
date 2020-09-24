import React from 'react';
import {Location} from 'history';

import {Organization} from 'app/types';
import DiscoverQuery from 'app/utils/discover/discoverQuery';
import EventView from 'app/utils/discover/eventView';

import {NUM_BUCKETS, WEB_VITAL_DETAILS} from './constants';
import {HistogramData, WebVital} from './types';

type ChildrenProps = {
  isLoading: boolean;
  errors: string[];
  histogram: Partial<Record<string, HistogramData[]>>;
};

type Props = {
  location: Location;
  organization: Organization;
  eventView: EventView;
  measures: string[];
  children: (props: ChildrenProps) => React.ReactNode;
};

/**
 * This class is a stub for the measurements data. It simply generates some
 * random data for the time being. It should be replaced with queries that
 * retrieve the true data from the backend.
 */
class MeasuresQuery extends React.Component<Props> {
  generateEventView() {
    const {eventView} = this.props;

    const measurementsJoin = `measurements_join(${Object.values(WebVital).join(',')})`;
    const measurementsHistogram = `measurements_histogram(${NUM_BUCKETS},null,null,0)`;
    const orderby = `measurements_histogram_${NUM_BUCKETS}_null_null_0`;

    return EventView.fromSavedQuery({
      id: '',
      name: '',
      version: 2,
      fields: [measurementsJoin, measurementsHistogram, 'count()'],
      orderby,
      projects: eventView.project,
      range: eventView.statsPeriod,
      query: eventView.query,
      environment: eventView.environment,
      start: eventView.start,
      end: eventView.end,
    });
  }

  render() {
    const {children, location, organization} = this.props;

    return (
      <DiscoverQuery
        location={location}
        orgSlug={organization.slug}
        eventView={this.generateEventView()}
      >
        {({isLoading, error, tableData}) => {
          // TODO(tonyx): Handle the empty states
          if (isLoading) {
            return 'loading';
          } else if (error) {
            return 'errored';
          }

          const measurements = Object.values(WebVital).map(s => s.replace('.', '_'));
          const measurementsKey = `measurements_join_${measurements.join('_')}`;
          const binKey = `measurements_histogram_${NUM_BUCKETS}_null_null_0`;

          const SLUG_TO_VITAL = Object.values(WebVital).reduce((mapping, vital) => {
            mapping[WEB_VITAL_DETAILS[vital].slug] = vital;
            return mapping;
          }, {});

          const results = (tableData?.data ?? []).reduce(
            (res, row) => {
              // TODO(tonyx): should the backend transform this to the expected format?
              const measurement = SLUG_TO_VITAL[row[measurementsKey]];
              const histogram = row[binKey];
              const count = row.count;
              res[measurement].push({histogram, count});
              return res;
            },
            {
              [WebVital.FP]: [],
              [WebVital.FCP]: [],
              [WebVital.LCP]: [],
              [WebVital.FID]: [],
            }
          );

          return children({
            isLoading: false,
            errors: [],
            histogram: results,
          });
        }}
      </DiscoverQuery>
    );
  }
}

export default MeasuresQuery;
