import {useEffect,useRef,useState} from 'react';
import {trafficAllowed,trafficChoice,setTrafficChoice,trackTraffic} from '@/lib/traffic';
import './traffic.css';
export function TrafficChoice({showPreferences=true}:{showPreferences?:boolean}){
 const [open,setOpen]=useState(false);const sent=useRef(false);
 const start=()=>{if(!sent.current&&trafficAllowed()){sent.current=true;void trackTraffic('page_view');}};
 useEffect(()=>{setOpen(!trafficChoice());start();},[]);
 function choose(yes:boolean){setTrafficChoice(yes);setOpen(false);start();}
 if(!showPreferences)return null;
 return <>{open?<aside className="axis-traffic-consent" aria-label="Website analytics preferences"><strong>Help us improve the site?</strong><p>Allow Axis Displays to count visits, pages, referral sources, device type and approximate country when available. No form answers or precise location are included. Your choice won’t affect the site.</p><div><button onClick={()=>choose(true)}>Allow analytics</button><button onClick={()=>choose(false)}>No thanks</button></div></aside>:<button className="axis-traffic-settings" onClick={()=>setOpen(true)}>Analytics preferences</button>}</>;
}
