import { useMemo } from 'react';
import { groupMyBookingsForDisplay } from '../utils';

const useGroupedBookings = (myBookings) =>
  useMemo(() => groupMyBookingsForDisplay(myBookings), [myBookings]);

export default useGroupedBookings;
