import { it, expect, vi, afterEach } from 'vitest';
import { builderInquiry, sendBuilderInquiry } from '@/lib/builder-inquiry';
import { defaultDesign } from '@/config/studio';
const contact = {name:'Test',email:'test@example.com',phone:'2025550100',location:'Phoenix, Arizona',church:'Test church',notes:'Please compare both models.'};
afterEach(()=>vi.unstubAllGlobals());
it('includes contact and a complete readable layout without imposing graphic content',()=>{
 const data=builderInquiry(defaultDesign,contact,'test-id');
 expect(data.get('submission_id')).toBe('test-id');
 expect(data.get('phone')).toBe(contact.phone);
 expect(data.get('description')).toContain('WALL BUILDER QUOTE REQUEST');
 for(const s of defaultDesign.sections)expect(data.get('description')).toContain(`${s.cols} × ${s.rows} panels`);
 expect(data.get('description')).toContain('visualization only');
 expect(String(data.get('description')).length).toBeLessThanOrEqual(3000);
});
it('only confirms explicit backend success and preserves the retry identifier',async()=>{
 const data=builderInquiry(defaultDesign,contact,'same-id');
 const fetch=vi.fn().mockResolvedValueOnce({ok:false,status:500,json:async()=>({success:false})}).mockResolvedValueOnce({ok:true,status:200,json:async()=>({success:true})});
 vi.stubGlobal('fetch',fetch);
 await expect(sendBuilderInquiry('/endpoint',data)).rejects.toThrow();
 await expect(sendBuilderInquiry('/endpoint',data)).resolves.toBeUndefined();
 expect(fetch.mock.calls[0][1].body.get('submission_id')).toBe(fetch.mock.calls[1][1].body.get('submission_id'));
});
