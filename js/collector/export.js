import {get,put,all} from '../core/db.js';
import {pack} from '../core/crypto.js';
import {list,ldate} from './ledger.js';
import {getManual} from './names.js';
import {sendFile} from './personal.js';
export async function exportArchive(a){
  const last=(await get('meta','lastExport'))||'',entries=(await list()).filter(x=>x.time>last);
  if(!entries.length)return {n:0};
  const f=await get('meta','file'),created=new Date().toISOString(),name=`${a.name}_${a.no}_${ldate(new Date())}.arc`;
  const bytes=await pack({schemaVersion:1,type:'archive',no:a.no,name:a.name,cycle:f.cycle,created,entries,names:await getManual(),otherSource:await all('otherSource')},a.master);
  await sendFile(new File([bytes],name,{type:'application/octet-stream'}));await put('meta','lastExport',created);return {n:entries.length,name};
}
