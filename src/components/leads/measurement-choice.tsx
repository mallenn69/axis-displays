import { useEffect, useState } from 'react';
import { measurementAllowed, measurementChoice, setMeasurementAllowed, startPixel } from '@/lib/meta-pixel';
import { measurementCopy } from '@/config/leads';
export function MeasurementChoice() {
 const [open, setOpen] = useState(false);
 useEffect(() => { setOpen(!measurementChoice()); if (measurementAllowed()) startPixel(); }, []);
 function choose(allowed: boolean) { setMeasurementAllowed(allowed); setOpen(false); }
 return <aside className="lead-measurement" aria-label="Advertising privacy">{open ? <><p>{measurementCopy.description}</p><div><button type="button" onClick={() => choose(true)}>{measurementCopy.accept}</button><button type="button" onClick={() => choose(false)}>{measurementCopy.decline}</button></div></> : <button type="button" onClick={() => setOpen(true)}>{measurementCopy.settings}</button>}</aside>;
}
