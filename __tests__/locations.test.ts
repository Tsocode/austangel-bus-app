jest.mock('firebase/database', () => ({
  ref: jest.fn((db, path) => ({ db, path })),
  onValue: jest.fn((reference, callback) => {
    callback({ val: () => ({ latitude: 1, longitude: 2, updatedAt: 1000 }) });
    return () => undefined;
  }),
  set: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/services/firebase', () => ({
  realtimeDb: {},
}));

import { onValue, ref, set } from 'firebase/database';

import { realtimeDb } from '@/services/firebase';
import { subscribeToLiveLocation, updateLiveLocation } from '@/services/realtime/locations';

describe('live location service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes using firebase database path', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToLiveLocation('bus-1', callback);

    expect(ref).toHaveBeenCalledWith(realtimeDb, 'liveLocations/bus-1');
    expect(onValue).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith({ latitude: 1, longitude: 2, updatedAt: 1000 });
    expect(typeof unsubscribe).toBe('function');
  });

  it('updates location payload', async () => {
    await updateLiveLocation('bus-2', { latitude: 3, longitude: 4, updatedAt: 2000 });
    expect(set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ latitude: 3, longitude: 4 }));
  });
});
