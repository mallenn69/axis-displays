import { installMap as map } from '@/config/install-map';
export function InstallMap() {
  return <section className="dc-installs-map" aria-labelledby="install-map-title">
    <div><span className="dc-map-eyebrow">{map.eyebrow}</span><h2 id="install-map-title">{map.title}</h2><p>{map.description}</p><ul>{map.pins.map(pin=><li key={pin.label}><span aria-hidden="true"/>{pin.label}</li>)}</ul></div>
    <svg viewBox="0 0 700 440" role="img" aria-label="Install locations in Arizona, Atlanta in Georgia, Missouri, and Florida. Map of the contiguous United States.">
      {map.states.map(state=><path key={state.name} d={state.d} className={['Arizona','Georgia','Missouri','Florida'].includes(state.name)?'dc-map-state active':'dc-map-state'}/>)}
      {map.pins.map(pin=><g key={pin.label} transform={`translate(${pin.x} ${pin.y})`}><title>{pin.label}</title><circle r="13" fill="#49baff" opacity=".15"/><circle r="6" fill="#66cbff" stroke="#071019" strokeWidth="2"/><circle r="2" fill="white"/></g>)}
    </svg>
  </section>;
}
