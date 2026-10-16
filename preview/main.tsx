import { TrafficChoice } from "../src/components/leads/traffic-choice";
import { createRoot } from 'react-dom/client';
import { DarkConcept } from '../src/components/concept/dark-concept';
import '../src/styles.css';
createRoot(document.getElementById('root')!).render(<><DarkConcept /><TrafficChoice showPreferences={false} /></>);
