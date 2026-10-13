import { it, expect } from 'vitest';
import { homepageInquiry } from '../lib/homepage-inquiry';
it('preserves homepage contact and project details for the live lead service',()=>{
 const data=homepageInquiry({name:'Test',phone:'2025550100',email:'test@example.com',church_name:'Test church',state:'Arizona',city:'Phoenix',role:'Pastor',stage_width:20,install_timeline:'This year',message:'Stage upgrade',website:''},'same-id');
 expect(data.get('submission_id')).toBe('same-id');
 expect(data.get('phone')).toBe('2025550100');
 expect(data.get('description')).toContain('HOMEPAGE INQUIRY');
 for(const detail of ['Phoenix','Pastor','20 ft','This year','Stage upgrade']) expect(data.get('description')).toContain(detail);
});
