jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, collection, id) => ({ db, collection, id })),
  updateDoc: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/services/firebase', () => ({
  db: {},
}));

import { doc, updateDoc } from 'firebase/firestore';

import { updateBusDriver } from '@/services/firestore/buses';

describe('updateBusDriver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes null for optional values when not provided', async () => {
    await updateBusDriver('bus-1', { driverName: 'Mr. Adewale' });

    expect(doc).toHaveBeenCalledWith(expect.anything(), 'buses', 'bus-1');
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      driverId: null,
      driverName: 'Mr. Adewale',
      updatedAt: expect.any(Number),
    });
  });

  it('sends driverId when provided', async () => {
    await updateBusDriver('bus-2', { driverId: 'driver-123', driverName: 'Mrs. Bisi' });

    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ driverId: 'driver-123' }));
  });
});
