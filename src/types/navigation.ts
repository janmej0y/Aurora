export type AuroraLaunchParams = {
  autoStartVoice?: boolean;
  launchId?: string;
};

export type RootStackParamList = {
  Intro: undefined;
  Auth: undefined;
  Onboarding: undefined;
  TrackingSetup: undefined;
  Main: undefined;
  Companion: AuroraLaunchParams | undefined;
  Sleep: undefined;
  Nutrition: undefined;
  Reports: undefined;
  DeviceIntegrations: undefined;
};

export type TabParamList = {
  Home: undefined;
  Water: undefined;
  AuroraAI: AuroraLaunchParams | undefined;
  Habits: undefined;
  Profile: undefined;
};
