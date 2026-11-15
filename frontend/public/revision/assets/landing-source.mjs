const key='ah_landing_source';
export function captureLandingSource(){
 try {
  if(navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true){document.cookie=`${key}=; Path=/; Max-Age=0; SameSite=Lax`;return;}
  const source=document.body.dataset.blogSource;
  if(!/^blog\/[a-z0-9-]{1,80}$/.test(source||''))return;
  const current=document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(key+'='));
  if(current&&/^blog\/[a-z0-9-]{1,80}$/.test(decodeURIComponent(current.slice(key.length+1))))return;
  document.cookie=`${key}=${encodeURIComponent(source)}; Path=/; Max-Age=2592000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
 }catch{/* Cookie restrictions must never block reading, registration or payments. */}
}
if(typeof document!=='undefined')captureLandingSource();
