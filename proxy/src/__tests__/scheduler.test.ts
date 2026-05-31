import { runReminderTick } from '../services/scheduler';

jest.mock('../services/firebase', () => ({
  db: { collection: jest.fn().mockReturnThis(), get: jest.fn() },
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
}));
const fb = jest.requireMock('../services/firebase') as {
  db: { collection: jest.Mock; get: jest.Mock };
  sendPushNotification: jest.Mock;
};

describe('runReminderTick', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a push to users due at the given instant', async () => {
    fb.db.get.mockResolvedValueOnce({ docs: [{
      id: 'u1',
      data: () => ({
        fcmToken: 'tok',
        notificationSettings: {
          middayReminderHour: 11, middayReminderMinute: 30,
          eveningReminderHour: 20, eveningReminderMinute: 0,
          weeklyPlanningWeekday: 0, weeklyPlanningHour: 19, weeklyPlanningMinute: 0,
          timeZone: 'America/New_York', streakReminders: true,
        },
      }),
    }] });

    await runReminderTick(new Date('2026-06-01T15:30:00Z'));
    expect(fb.sendPushNotification).toHaveBeenCalledTimes(1);
    expect(fb.sendPushNotification).toHaveBeenCalledWith('tok', expect.stringContaining('Midday'), expect.any(String));
  });

  it('sends nothing when no user is due', async () => {
    fb.db.get.mockResolvedValueOnce({ docs: [] });
    await runReminderTick(new Date('2026-06-01T18:00:00Z'));
    expect(fb.sendPushNotification).not.toHaveBeenCalled();
  });
});
