import { assertDateAdapterContract } from '../../src/test-utils/contract';
import { NativeDateAdapter } from './native-date-adapter';

assertDateAdapterContract(NativeDateAdapter, {
  dateTimeWithMilliseconds: () => new Date(2026, 5, 15, 9, 10, 11, 250),
});
