type Stage = 'registration_open' | 'registration_complete' | 'payment_attempt';
export function trackAcquisition(stage: Stage): void {
  const modulePath = '/revision/assets/acquisition.mjs';
  void import(/* @vite-ignore */ modulePath).then(module => module.trackStage(stage)).catch(() => undefined);
}
