import { CalendarDateTime } from '@internationalized/date';

import { assertDateAdapterContract } from '../../src/test-utils/contract';
import { InternationalizedDateTimeAdapter } from './internationalized-date-time-adapter';

assertDateAdapterContract(InternationalizedDateTimeAdapter, {
  dateTimeWithMilliseconds: () => new CalendarDateTime(2026, 6, 15, 9, 10, 11, 250),
});
