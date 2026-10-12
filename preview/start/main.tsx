import { TrafficChoice } from "../../src/components/leads/traffic-choice";
import { createRoot } from 'react-dom/client';
import { LeadPage } from '../../src/components/leads/lead-page';
createRoot(document.getElementById('root')!).render(<><LeadPage /><TrafficChoice /></>);
