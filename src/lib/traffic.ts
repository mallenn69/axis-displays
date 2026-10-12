const consentKey='axis-traffic-consent-v1';
export function trafficAllowed(){try{return localStorage.getItem(consentKey)==='yes' && !(navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl;}catch{return false;}}
export function trafficChoice(){try{return localStorage.getItem(consentKey);}catch{return null;}}
export function setTrafficChoice(allow:boolean){try{localStorage.setItem(consentKey,allow?'yes':'no');if(!allow){sessionStorage.removeItem('axis-traffic-visit');sessionStorage.removeItem('axis-traffic-source');}}catch{} }
export function trafficSource(referrer:string,search:string){const utm=new URLSearchParams(search).get('utm_source')?.toLowerCase()||'';let host='';try{host=new URL(referrer).hostname;}catch{}const value=utm||host;if(/facebook|(^|\.)fb\.com$|^fb$/.test(value))return 'Facebook';if(/instagram|^ig$/.test(value))return 'Instagram';if(/google/.test(value))return 'Google';if(!value||host==='axisledwalls.com'||host==='www.axisledwalls.com')return 'Direct';return 'Other';}
export async function trackTraffic(event:'page_view'|'quote_submitted',id=crypto.randomUUID()){
 try{
 if(!trafficAllowed()||!['axisledwalls.com','www.axisledwalls.com'].includes(location.hostname))return;
 const path=location.pathname==='/'?'/':location.pathname.replace(/\/$/,'')+'/';if(!['/','/build/','/start/'].includes(path))return;
 const base=import.meta.env['VITE_SUPABASE_URL'],key=import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];if(!base||!key)return;
 let visit=sessionStorage.getItem('axis-traffic-visit');if(!visit){visit=crypto.randomUUID();sessionStorage.setItem('axis-traffic-visit',visit);sessionStorage.setItem('axis-traffic-source',trafficSource(document.referrer,location.search));}
 const body={event_id:id,visit_id:visit,page_path:path,event_name:event,traffic_source:sessionStorage.getItem('axis-traffic-source')||'Direct',device_type:matchMedia('(max-width: 767px)').matches?'Mobile':'Desktop'};
 await fetch(base+'/rest/v1/rpc/axis_track_event',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true});
 }catch{/* Analytics never blocks the site or a submission. */}
}
