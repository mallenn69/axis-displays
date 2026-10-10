import { describe, expect, it } from 'vitest';
import { quoteSchema } from '@/config/quote';
const valid={name:'Test Name',church_name:'Test Church',role:'Tech Director',email:'test@example.com',phone:'',city:'Phoenix',state:'AZ',stage_width:'',install_timeline:'Just exploring',message:'',website:''};
describe('Quote request validation',()=>{
 it('accepts a complete request and normalizes optional width',()=>{expect(quoteSchema.parse(valid).stage_width).toBeNull();});
 it('requires valid email and church name',()=>{expect(quoteSchema.safeParse({...valid,email:'bad',church_name:''}).success).toBe(false);});
 it('rejects invalid role and timeline',()=>{expect(quoteSchema.safeParse({...valid,role:'Admin',install_timeline:'Tomorrow'}).success).toBe(false);});
 it('rejects honeypot content and out-of-range widths',()=>{expect(quoteSchema.safeParse({...valid,website:'spam'}).success).toBe(false);expect(quoteSchema.safeParse({...valid,stage_width:1001}).success).toBe(false);});
 it('accepts a numeric stage width',()=>{expect(quoteSchema.parse({...valid,stage_width:'24'}).stage_width).toBe(24);});
});
