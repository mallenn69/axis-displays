import { site } from '@/config/site';
import logo from '@/assets/axis-displays-logo.png';

export function Logo() {
  return <span className="axis-logo axis-logo-generated"><img src={logo} alt={site.name} width={720} height={240} /></span>;
}
