import { createClient } from 'npm:@supabase/supabase-js@2';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const allowed=new Set(['https://axisledwalls.com','https://www.axisledwalls.com']);
const MAX=8*1024*1024;
const roles=['owner','admin','sales','viewer'];
function hookUrl(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='hooks.zapier.com'||u.port||u.username||u.password||u.search||u.hash||!/^\/hooks\/catch\/\d+\/[A-Za-z0-9_-]+\/?$/.test(u.pathname))throw new Error('Use a valid HTTPS Zapier Catch Hook URL.');return u.href;}
function text(data:FormData,key:string,min:number,max:number){const value=data.get(key);if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new Error(`Invalid ${key}.`);return value.trim();}
async function settings(role:string){const {data,error}=await db.from('axis_crm_settings').select('*').eq('id',true).single();if(error)throw error;return {enabled:data.enabled,configured:!!data.webhook_url,destination:data.webhook_url?'hooks.zapier.com':null,role};}
async function deliver(id:string){
 const {data:cfg,error:cfgError}=await db.from('axis_crm_settings').select('*').eq('id',true).single();if(cfgError||!cfg?.webhook_url)return {message:'Connect Zapier first.',sent:false};
 const {error:queueError}=await db.from('axis_crm_deliveries').upsert({lead_id:id},{onConflict:'lead_id',ignoreDuplicates:true});if(queueError)throw queueError;
 const {data:claimed,error:claimError}=await db.rpc('axis_claim_delivery',{target:id});if(claimError)throw claimError;const event=claimed?.[0];if(!event)return {message:'Already sent or currently sending.',sent:false};
 const {data:lead,error}=await db.from('church_leads').select('*').eq('id',id).single();
 try {
  if(error||!lead)throw new Error('Lead unavailable');
  const response=await fetch(hookUrl(cfg.webhook_url),{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json','Idempotency-Key':event.event_id},body:JSON.stringify({event:'lead.created',event_id:event.event_id,lead_id:lead.id,created_at:lead.created_at,name:lead.name,phone:lead.phone,email:lead.email,state:lead.state,church_name:lead.church_name,description:lead.description,source:lead.source,has_photo:!!lead.photo_path})});
  if(!response.ok)throw new Error(`Webhook returned ${response.status}`);
  const {error:saveError}=await db.from('axis_crm_deliveries').update({status:'delivered',delivered_at:new Date().toISOString(),last_error:null}).eq('lead_id',id);if(saveError)throw saveError;
  return {message:'Accepted by Zapier. Check the Zap task history for CRM delivery.',sent:true};
 } catch {
  await db.from('axis_crm_deliveries').update({status:'failed',last_error:'Delivery was not confirmed. Check Zapier, then retry using the same event ID.'}).eq('lead_id',id);
  return {message:'Delivery was not confirmed. The lead is saved. You can retry from the inbox.',sent:false};
 }
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin');const cors={'Access-Control-Allow-Origin':origin&&allowed.has(origin)?origin:'https://axisledwalls.com','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, PATCH, PUT, OPTIONS','Vary':'Origin'};
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(origin&&!allowed.has(origin))return json({error:'Origin not allowed.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 const parts=new URL(req.url).pathname.split('/axis-leads')[1]?.split('/').filter(Boolean)??[];
 try {
 if(!parts.length&&req.method==='POST'){
  if(Number(req.headers.get('content-length'))>MAX+32768)return json({error:'Upload too large.'},413);
  // Bound streamed request before parsing multipart data.
  const reader=req.body?.getReader();if(!reader)return json({error:'Missing request.'},400);const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX+32768){await reader.cancel();return json({error:'Upload too large.'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let off=0;for(const chunk of chunks){bytes.set(chunk,off);off+=chunk.length;}
  const data=await new Response(bytes,{headers:{'Content-Type':req.headers.get('content-type')??''}}).formData();
  if(data.get('website'))return json({success:true});
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'unknown';
  const hashed=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')));const key=Array.from(new Uint8Array(hashed)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const {data:rate,error:rateError}=await db.rpc('axis_check_intake',{key_hash:key});if(rateError)throw rateError;if(!rate)return json({error:'Too many attempts. Please try again later.'},429);
  const submission_id=text(data,'submission_id',36,36);if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(submission_id))return json({error:'Invalid request ID.'},400);
  const lead={submission_id,name:text(data,'name',1,100),phone:text(data,'phone',7,40),email:text(data,'email',3,254),church_name:text(data,'church_name',1,150),state:text(data,'state',2,100),description:text(data,'description',1,3000),source:'facebook'};
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)||lead.phone.replace(/\D/g,'').length<7)return json({error:'Check your email and phone number.'},400);
  const {data:existing,error:existingError}=await db.from('church_leads').select('id').eq('submission_id',submission_id).maybeSingle();if(existingError)throw existingError;if(existing)return json({success:true});
  const photo=data.get('photo');let photo_path:string|null=null;
  if(photo instanceof File&&photo.size){
   if(photo.size>MAX)return json({error:'Photo must be smaller than 8 MB.'},400);
   const b=new Uint8Array(await photo.arrayBuffer());
   const type=b[0]===255&&b[1]===216&&b[2]===255?'image/jpeg':b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71?'image/png':new TextDecoder().decode(b.slice(0,4))==='RIFF'&&new TextDecoder().decode(b.slice(8,12))==='WEBP'?'image/webp':null;
   if(!type||type!==photo.type)return json({error:'Please choose a JPG, PNG or WebP photo.'},400);
   photo_path=`${crypto.randomUUID()}.${type.split('/')[1]}`;
   const {error}=await db.storage.from('sanctuary-photos').upload(photo_path,b,{contentType:type,upsert:false});if(error)throw error;
  }
  const {data:saved,error}=await db.from('church_leads').insert({...lead,photo_path}).select('id').single();
  if(error){if(photo_path)await db.storage.from('sanctuary-photos').remove([photo_path]);if(error.code==='23505')return json({success:true});throw error;}
  // A failed webhook never prevents a saved lead from appearing in the inbox.
  const {data:cfg}=await db.from('axis_crm_settings').select('enabled').eq('id',true).single();
  if(cfg?.enabled){await db.from('axis_crm_deliveries').upsert({lead_id:saved.id},{onConflict:'lead_id',ignoreDuplicates:true});try{await deliver(saved.id);}catch{/* retry is available in admin */}}
  return json({success:true});
 }
 const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)return json({error:'Sign in required.'},401);
 const {data:user,error:authError}=await db.auth.getUser(token);if(authError||!user.user)return json({error:'Sign in required.'},401);
 const {data:member,error:memberError}=await db.from('axis_staff_members').select('role').eq('user_id',user.user.id).maybeSingle();if(memberError||!member||!roles.includes(member.role))return json({error:'Your account has not been granted workspace access.'},403);
 const role=member.role;const edit=role!=='viewer';const owner=['owner','admin'].includes(role);
 if(parts[0]==='admin'&&req.method==='GET'){
  const {data,error}=await db.from('church_leads').select('*,axis_crm_deliveries(status,attempts,delivered_at,last_error)').order('created_at',{ascending:false}).limit(500);if(error)throw error;
  return json({leads:data.map(({axis_crm_deliveries,...lead})=>({...lead,delivery:axis_crm_deliveries})),settings:await settings(role)});
 }
 if(parts[0]==='photo'&&req.method==='GET'){
  const {data,error}=await db.from('church_leads').select('photo_path').eq('id',parts[1]).single();if(error||!data.photo_path)return json({error:'Photo not found.'},404);
  const signed=await db.storage.from('sanctuary-photos').createSignedUrl(data.photo_path,300);if(signed.error)throw signed.error;return json({url:signed.data.signedUrl});
 }
 if(parts[0]==='lead'&&req.method==='PATCH'){
  if(!edit)return json({error:'Read-only access.'},403);
  const body=await req.json();const patch:Record<string,unknown>={updated_at:new Date().toISOString()};
  if(body.status!==undefined){if(!['new','contacted','qualified','closed'].includes(body.status))return json({error:'Invalid status.'},400);patch.status=body.status;}
  if(body.notes!==undefined){if(typeof body.notes!=='string'||body.notes.length>5000)return json({error:'Notes are too long.'},400);patch.notes=body.notes;}
  if(typeof body.updated_at!=='string')return json({error:'Reload this lead before editing.'},400);
  const {data,error}=await db.from('church_leads').update(patch).eq('id',parts[1]).eq('updated_at',body.updated_at).select().maybeSingle();if(error)throw error;if(!data)return json({error:'This lead changed. Refresh the inbox before saving.'},409);return json(data);
 }
 if(parts[0]==='settings'&&req.method==='PUT'){
  if(!owner)return json({error:'Owner or admin access required.'},403);const body=await req.json();if(typeof body.enabled!=='boolean')return json({error:'Invalid setting.'},400);
  let url:string|undefined;if(body.url!==undefined)url=hookUrl(body.url);
  const prior=await settings(role);if(body.enabled&&!url&&!prior.configured)return json({error:'Add a Zapier Catch Hook first.'},400);
  const {error}=await db.from('axis_crm_settings').update({enabled:body.enabled,...(url?{webhook_url:url}:{}),updated_at:new Date().toISOString()}).eq('id',true);if(error)throw error;return json(await settings(role));
 }
 if(parts[0]==='sync'&&req.method==='POST'){if(!edit)return json({error:'Read-only access.'},403);return json(await deliver(parts[1]));}
 if(parts[0]==='test'&&req.method==='POST'){
  if(!owner)return json({error:'Owner or admin access required.'},403);const {data}=await db.from('axis_crm_settings').select('webhook_url').eq('id',true).single();if(!data?.webhook_url)return json({error:'Save a connection first.'},400);
  const response=await fetch(hookUrl(data.webhook_url),{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify({event:'lead.created',test:true,event_id:crypto.randomUUID(),lead_id:crypto.randomUUID(),created_at:new Date().toISOString(),name:'Sample contact',phone:'202-555-0100',email:'sample@example.com',church_name:'Sample church',state:'Arizona',description:'Test event from Axis Displays. This is not a real lead.',source:'facebook',has_photo:false})});if(!response.ok)return json({error:'Zapier did not accept the test.'},502);return json({success:true});
 }
 return json({error:'Not found.'},404);
 }catch(e){const msg=e instanceof Error?e.message:'';const safe=/^(Invalid |Use a valid)/.test(msg);return json({error:safe?msg:'Unable to complete the request. Please try again.'},safe?400:500);}
});
