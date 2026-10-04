/* Frios PA Cloud bridge - Supabase */
const FRIOS_SUPABASE_URL = 'https://nomcmgegvdkmqfsiutdd.supabase.co';
const FRIOS_SUPABASE_KEY = 'sb_publishable_SRQwf9gyxsLI6dsCcaL5GQ_7YlmQQEa';
const friosSB = window.supabase.createClient(FRIOS_SUPABASE_URL, FRIOS_SUPABASE_KEY);
let friosUser = null;
let friosProfile = null;
let friosRealtime = null;

function cloudMapProduct(r){
  return {id:r.id,name:r.name,ean:r.ean||'',date:r.expiration_date,tag:Number(r.work_tag_days)||12,location:r.location||'Localização não informada',plu:Boolean(r.plu_identified),photo:r.photo_url||'',selected:false,brand:r.brand||''};
}
async function cloudLoadProducts(){
  const {data,error}=await friosSB.from('products').select('*').eq('active',true).order('expiration_date',{ascending:true});
  if(error){console.error(error); alert('Não foi possível carregar os produtos da nuvem.'); return;}
  products=(data||[]).map(cloudMapProduct);
  if(typeof render==='function') render();
}
async function cloudProfile(){
  if(!friosUser) return null;
  const {data,error}=await friosSB.from('profiles').select('*').eq('id',friosUser.id).single();
  if(error){console.error(error); return null}
  friosProfile=data; window.FRIOS_PROFILE=data; return data;
}
async function cloudLogin(){
  const err=$('err'); err.classList.add('hidden');
  let login=$('u').value.trim(); const password=$('p').value;
  if(!login||!password){err.textContent='Informe usuário e senha';err.classList.remove('hidden');return}
  if(!login.includes('@')) login += '@pa.com';
  const btn=$('enter');
  const originalText=btn.textContent;
  btn.disabled=true; btn.textContent='Entrando...';
  const {data,error}=await friosSB.auth.signInWithPassword({email:login,password});
  btn.disabled=false; btn.textContent=originalText;
  if(error){err.textContent='Usuário/senha incorreta';err.classList.remove('hidden');$('p').focus();return}
  friosUser=data.user; await cloudProfile();
  if(!friosProfile || !friosProfile.active){await friosSB.auth.signOut();err.textContent='Usuário desativado';err.classList.remove('hidden');return}
  $('login').classList.add('hidden'); $('app').classList.remove('hidden');
  await cloudLoadProducts(); cloudSubscribe();
}
async function cloudLogout(){await friosSB.auth.signOut();friosUser=null;friosProfile=null;if(friosRealtime)await friosSB.removeChannel(friosRealtime);$('app').classList.add('hidden');$('login').classList.remove('hidden');}
function cloudSubscribe(){
  if(friosRealtime) friosSB.removeChannel(friosRealtime);
  friosRealtime=friosSB.channel('frios-products-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'products'},()=>cloudLoadProducts())
    .subscribe();
}
async function uploadFriosPhoto(photo){
  if(!photo || !photo.startsWith('data:')) return photo||'';
  try{
    const res=await fetch(photo); const blob=await res.blob();
    const ext=(blob.type||'image/jpeg').split('/')[1]||'jpg';
    const path=`${friosUser.id}/${crypto.randomUUID()}.${ext}`;
    const up=await friosSB.storage.from('frios-produtos').upload(path,blob,{contentType:blob.type||'image/jpeg',upsert:true});
    if(up.error){console.warn(up.error);return photo}
    const pub=friosSB.storage.from('frios-produtos').getPublicUrl(path);
    return pub.data.publicUrl;
  }catch(e){console.warn(e);return photo}
}
async function cloudSaveProduct(){
  const name=$('fName').value.trim(),ean=$('fEan').value.trim(),date=$('fDate').value;
  const tag=$('fTag').value==='custom'?Number($('fCustomTag').value):Number($('fTag').value);
  const location=$('fLocation').value.trim(),plu=$('fPlu').checked;
  let photo=window.pendingProductPhoto||'';
  if(!name||!date||!tag){alert('Preencha descrição, vencimento e tag de trabalho.');return}
  photo=await uploadFriosPhoto(photo);
  const payload={name,ean:ean||null,brand:null,photo_url:photo||null,expiration_date:date,work_tag_days:tag,location:location||'Localização não informada',plu_identified:plu,active:true,updated_by:friosUser.id};
  let result;
  if(editingId && editingId!=='new') result=await friosSB.from('products').update(payload).eq('id',editingId).select().single();
  else result=await friosSB.from('products').insert({...payload,created_by:friosUser.id}).select().single();
  if(result.error){console.error(result.error);alert('Não foi possível salvar o produto na nuvem.');return}
  editingId=null; window.pendingProductPhoto=''; await cloudLoadProducts(); renderProducts();
}
async function cloudRemoveSelected(){
  const ids=products.filter(p=>p.selected).map(p=>p.id); if(!ids.length)return;
  if(!confirm(`Remover ${ids.length} produto(s) selecionado(s)?`))return;
  const {error}=await friosSB.from('products').update({active:false,updated_by:friosUser.id}).in('id',ids);
  if(error){alert('Não foi possível remover os produtos.');return}
  await cloudLoadProducts(); renderProducts();
}
async function cloudMarkPlu(value){
  const ids=products.filter(p=>p.selected).map(p=>p.id); if(!ids.length){alert('Marque pelo menos um produto.');return}
  const {error}=await friosSB.from('products').update({plu_identified:value,updated_by:friosUser.id}).in('id',ids);
  if(error){alert('Não foi possível atualizar o PLU.');return}
  await cloudLoadProducts(); renderProducts();
}

// Substitui o comportamento local somente quando a página estiver carregada.
window.addEventListener('load', async ()=>{
  $('u').placeholder='E-mail ou usuário';
  $('enter').onclick=cloudLogin;
  $('out').onclick=cloudLogout;
  $('app').classList.add('hidden');
  $('login').classList.remove('hidden');
  const {data}=await friosSB.auth.getSession();
  if(data.session){
    friosUser=data.session.user; await cloudProfile();
    if(friosProfile?.active){
      $('login').classList.add('hidden');$('app').classList.remove('hidden');
      await cloudLoadProducts();cloudSubscribe();
    } else {
      await friosSB.auth.signOut();
      const err=$('err'); err.textContent='Perfil não autorizado ou desativado.'; err.classList.remove('hidden');
    }
  } else {$('app').classList.add('hidden');$('login').classList.remove('hidden');}
});

// Intercepta operações de produto para a nuvem.
const _saveProduct=window.saveProduct;
window.saveProduct=cloudSaveProduct;
const _removeSelected=window.removeSelected;
window.removeSelected=cloudRemoveSelected;
const _fabAction=window.fabAction;
window.fabAction=async function(action){
  if(action==='plu'){await cloudMarkPlu(true);return}
  if(action==='unplu'){await cloudMarkPlu(false);return}
  if(action==='remove'){await cloudRemoveSelected();return}
  return _fabAction(action);
};


// Mantém o estado da aplicação sincronizado com a sessão do Supabase.
friosSB.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT') {
    friosUser=null; friosProfile=null; window.FRIOS_PROFILE=null;
    $('app').classList.add('hidden');
    $('login').classList.remove('hidden');
  }
});
