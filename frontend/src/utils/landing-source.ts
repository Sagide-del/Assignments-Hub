import { validLandingSource } from '../../../backend/src/analytics/landing-source';
export function getLandingSource(): string | undefined {
 try {
  if(navigator.doNotTrack==='1'||(navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl)return undefined;
  const value=document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('ah_landing_source='));
  return value ? validLandingSource(decodeURIComponent(value.slice('ah_landing_source='.length))) ?? undefined : undefined;
 } catch { return undefined; }
}
