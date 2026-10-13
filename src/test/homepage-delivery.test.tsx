import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QuoteForm } from '../components/axis/quote-form';
vi.mock('@tanstack/react-start',()=>({useServerFn:(fn:unknown)=>fn}));
vi.mock('../lib/quotes.functions',()=>({submitQuote:vi.fn()}));
vi.mock('framer-motion',()=>({useReducedMotion:()=>true,motion:{div:'div',svg:'svg',path:'path'}}));
vi.mock('../components/axis/glass',()=>({GlassCard:({children}:any)=><div>{children}</div>,Reveal:({children}:any)=><div>{children}</div>,GlassButton:({children,primary,...props}:any)=><button {...props}>{children}</button>}));
beforeEach(()=>{vi.stubEnv('VITE_DESIGN_PREVIEW','true');vi.stubEnv('VITE_LEADS_ENDPOINT','https://example.test/leads');});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.unstubAllEnvs();});
function fill(){
 const {container}=render(<QuoteForm/>);
 for(const [name,value] of Object.entries({name:'Test',church_name:'Test church',role:'Pastor',email:'test@example.com',phone:'2025550100',city:'Phoenix',state:'Arizona'})) fireEvent.change(container.querySelector(`[name="${name}"]`)!,{target:{value}});
 return container.querySelector('form')!;
}
it('enables the deployed homepage and only confirms a saved inquiry',async()=>{
 let finish!:(r:unknown)=>void;
 vi.stubGlobal('fetch',vi.fn(()=>new Promise(resolve=>{finish=resolve;})));
 fireEvent.submit(fill());
 expect(screen.queryByRole('status')).toBeNull();
 finish({ok:true,json:async()=>({success:true})});
 await screen.findByRole('status');
 const body=vi.mocked(fetch).mock.calls[0][1]!.body as FormData;
 expect(body.get('description')).toContain('HOMEPAGE INQUIRY');
 expect(body.get('state')).toBe('Arizona');
});
it('keeps the form available and shows an error on backend failure',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({success:false})})));
 fireEvent.submit(fill());
 await screen.findByRole('alert');
 expect(screen.queryByRole('status')).toBeNull();
 await waitFor(()=>expect(screen.getByRole('button',{name:/Request|Send|Submit/i})).toBeEnabled());
});
