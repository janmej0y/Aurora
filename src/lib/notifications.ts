import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationPrefs = {
  hydrationReminders: boolean;
  sleepReminders: boolean;
  habitReminders: boolean;
  dailyInsights: boolean;
};

type UserSchedule = {
  wakeTime: string; // "HH:MM"
  bedtime: string;  // "HH:MM"
  name: string;
};

async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function parseHHMM(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: isNaN(h) ? 7 : h, minute: isNaN(m) ? 0 : m };
}

function addMinutes(hhmm: string, offset: number): { hour: number; minute: number } {
  const { hour, minute } = parseHHMM(hhmm);
  const total = hour * 60 + minute + offset;
  return { hour: Math.floor(total / 60) % 24, minute: total % 60 };
}

export async function scheduleHealthNotifications(
  prefs: NotificationPrefs,
  schedule: UserSchedule
): Promise<void> {
  try {
    const granted = await requestPermissions();
    if (!granted) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('aurora-health', {
        name: 'Aurora Health Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00D97E',
      });
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    if (prefs.hydrationReminders) {
      // Hydration reminders at 10 AM and 3 PM (only if after wake time)
      for (const [hour, minute] of [[10, 0], [15, 0]] as [number, number][]) {
        const wake = parseHHMM(schedule.wakeTime);
        const wakeMinutes = wake.hour * 60 + wake.minute;
        if (hour * 60 + minute > wakeMinutes) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Hydration Check 💧',
              body: `How's your water intake, ${schedule.name}? A quick sip keeps energy up.`,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute,
            },
          });
        }
      }
    }

    if (prefs.sleepReminders) {
      const sleepReminder = addMinutes(schedule.bedtime, -30);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Wind Down Time 🌙',
          body: `Bedtime in 30 minutes, ${schedule.name}. Dim the lights and start your routine.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: sleepReminder.hour,
          minute: sleepReminder.minute,
        },
      });
    }

    if (prefs.habitReminders) {
      const morningReminder = addMinutes(schedule.wakeTime, 60);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Morning Habits ✅',
          body: `Good morning, ${schedule.name}! Check off your morning habits to start strong.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: morningReminder.hour,
          minute: morningReminder.minute,
        },
      });
    }

    if (prefs.dailyInsights) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Your Daily Insight ✨',
          body: `Check Aurora for your personalized health summary, ${schedule.name}.`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 9,
          minute: 0,
        },
      });
    }
  } catch {
    // Notifications are optional — never block the app
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // silent
  }
}
