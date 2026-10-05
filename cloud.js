/* Frios PA Cloud bridge - Supabase */
const FRIOS_SUPABASE_URL = 'https://nomcmgegvdkmqfsiutdd.supabase.co';
const FRIOS_SUPABASE_KEY = 'sb_publishable_SRQwf9gyxsLI6dsCcaL5GQ_7YlmQQEa';
const friosSB = window.supabase.createClient(FRIOS_SUPABASE_URL, FRIOS_SUPABASE_KEY);
let friosUser = null;
let friosProfile = null;
let friosRealtime = null;
let friosNotificationChannel = null;
let friosNotificationSettings = null;
let friosNotifications = [];
window.FRIOS_NOTIFICATIONS = friosNotifications;
window.FRIOS_NOTIFICATION_SETTINGS = friosNotificationSettings;
window.friosNotificationPermission = ('Notification' in window) ? Notification.permission : 'unsupported';

function cloudMapProduct(r){
  return {id:r.id,name:r.name,ean:r.ean||'',date:r.expiration_date,tag:Number(r.work_tag_days)||12,location:r.location||'Localização não informada',plu:Boolean(r.plu_identified),photo:r.photo_url||'',selected:false,brand:r.brand||''};
}
async function cloudLoadProducts(){
  const {data,error}=await friosSB.from('products').select('*').eq('active',true).order('expiration_date',{ascending:true});
  if(error){console.error(error); uiAlert('Não foi possível carregar os produtos da nuvem.','Produtos'); return;}
  products=(data||[]).map(cloudMapProduct);
  if(typeof render==='function') render();
}
async function cloudProfile(){
  if(!friosUser) return null;
  const {data,error}=await friosSB.from('profiles').select('*').eq('id',friosUser.id).single();
  if(error){console.error(error); return null}
  friosProfile=data; window.FRIOS_PROFILE=data; return data;
}
async function cloudSignup(){
  const name=$('signupName')?.value.trim();
  const username=$('signupUsername')?.value.trim().toLowerCase().replace(/\s+/g,'');
  const email=$('signupEmail')?.value.trim().toLowerCase();
  const password=$('signupPassword')?.value||'';
  const confirm=$('signupPasswordConfirm')?.value||'';
  if(!name||!username||!email||!password||!confirm){uiAlert('Preencha nome, usuário, e-mail, senha e confirmação da senha.','Criar conta');return;}
  if(!/^[a-z0-9._-]{3,30}$/.test(username)){uiAlert('O usuário deve ter de 3 a 30 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.','Criar conta');return;}
  if(password.length<6){uiAlert('A senha precisa ter pelo menos 6 caracteres.','Criar conta');return;}
  if(password!==confirm){uiAlert('A confirmação da senha não confere.','Criar conta');return;}
  const btn=$('signupSubmit'); if(btn){btn.disabled=true;btn.textContent='Criando conta...';}
  const {data,error}=await friosSB.auth.signUp({email,password,options:{data:{name,username}}});
  if(btn){btn.disabled=false;btn.textContent='Criar conta';}
  if(error){
    const msg=error.message||'';
    if(msg.toLowerCase().includes('already registered')){uiAlert('Este e-mail já possui uma conta no Frios PA.','Conta já cadastrada');}
    else if(msg.toLowerCase().includes('username')){uiAlert('Esse usuário já está em uso. Escolha outro.','Usuário indisponível');}
    else uiAlert(msg,'Não foi possível criar a conta');
    return;
  }
  closeUiLayer();
  if(data.session){
    friosUser=data.user; await cloudProfile();
    if(!friosProfile?.active){await friosSB.auth.signOut();uiAlert('A conta foi criada, mas ainda não está autorizada para acessar o aplicativo.','Conta criada');return;}
    $('login').classList.add('hidden');$('app').classList.remove('hidden');await cloudLoadProducts();await cloudInitNotifications();cloudSubscribe();
    uiToast('Conta criada com sucesso.','success');
  }else{
    uiAlert('Sua conta foi criada. Verifique o e-mail de confirmação para ativá-la e depois entre no Frios PA.','Conta criada');
  }
}
function openSignup(){ensureUiLayer();const el=$('uiLayer');el.innerHTML=`<div class="ui-backdrop"><div class="ui-dialog signup-dialog"><div class="ui-dialog-head"><div><span class="eyebrow">NOVO ACESSO</span><h3>Criar minha conta</h3><p>Cadastre seus dados para usar o Frios PA.</p></div><button class="ui-close" onclick="closeUiLayer()">×</button></div><div class="signup-form"><label>Nome completo<input id="signupName" autocomplete="name" placeholder="Ex.: João da Silva"></label><label>Usuário<input id="signupUsername" autocomplete="username" placeholder="Ex.: joao.silva"></label><label>E-mail<input id="signupEmail" type="email" autocomplete="email" placeholder="seuemail@exemplo.com"></label><label>Senha<input id="signupPassword" type="password" autocomplete="new-password" placeholder="Mínimo de 6 caracteres"></label><label>Confirmar senha<input id="signupPasswordConfirm" type="password" autocomplete="new-password" placeholder="Repita sua senha"></label></div><div class="ui-dialog-actions"><button class="ghost-btn" onclick="closeUiLayer()">Cancelar</button><button id="signupSubmit" class="primary-btn" onclick="cloudSignup()">Criar conta</button></div></div></div>`;el.classList.remove('hidden');setTimeout(()=>$('signupName')?.focus(),40)}
function openResetPassword(){ensureUiLayer();const current=($('u')?.value||'').trim();const el=$('uiLayer');el.innerHTML=`<div class="ui-backdrop"><div class="ui-dialog"><div class="ui-dialog-head"><div><span class="eyebrow">RECUPERAÇÃO</span><h3>Redefinir senha</h3><p>Informe o e-mail da sua conta para receber as instruções.</p></div><button class="ui-close" onclick="closeUiLayer()">×</button></div><label class="signup-field">E-mail<input id="resetEmail" type="email" value="${escapeHtml(current.includes('@')?current:'')}" placeholder="seuemail@exemplo.com"></label><div class="ui-dialog-actions"><button class="ghost-btn" onclick="closeUiLayer()">Cancelar</button><button class="primary-btn" onclick="sendFriosPasswordReset()">Enviar instruções</button></div></div></div>`;el.classList.remove('hidden')}
async function sendFriosPasswordReset(){const email=$('resetEmail')?.value.trim();if(!email){uiAlert('Informe o e-mail da conta.','Redefinir senha');return;}const {error}=await friosSB.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error){uiAlert(error.message,'Redefinir senha');return;}closeUiLayer();uiAlert('Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.','Redefinir senha');}
async function cloudLoadNotificationSettings(){if(!friosUser)return;const {data,error}=await friosSB.from('notification_settings').select('*').eq('user_id',friosUser.id).maybeSingle();if(error){console.warn(error);return;}friosNotificationSettings=data||{user_id:friosUser.id,enabled:true,daily_summary_enabled:true,daily_summary_time:'05:00',realtime_enabled:true};window.FRIOS_NOTIFICATION_SETTINGS=friosNotificationSettings;}
async function cloudLoadNotifications(){if(!friosUser)return;const {data,error}=await friosSB.from('notifications').select('*').eq('user_id',friosUser.id).order('created_at',{ascending:false}).limit(50);if(error){console.warn(error);return;}friosNotifications=data||[];window.FRIOS_NOTIFICATIONS=friosNotifications;if(typeof render==='function'&&page==='alerts')render();}
async function cloudSaveNotificationSettings(){if(!friosUser)return;const daily=$('dailySummaryEnabled')?.checked!==false; const realtime=$('realtimeEnabled')?.checked!==false; const payload={enabled:daily||realtime,daily_summary_enabled:daily,daily_summary_time:$('dailySummaryTime')?.value||'05:00',realtime_enabled:realtime};const {data,error}=await friosSB.from('notification_settings').upsert({user_id:friosUser.id,...payload},{onConflict:'user_id'}).select().single();if(error){uiAlert(error.message,'Notificações');return;}friosNotificationSettings=data;window.FRIOS_NOTIFICATION_SETTINGS=data;await maybeGenerateDailySummary();uiToast('Configurações de notificação salvas.','success');}
async function markFriosNotificationRead(id){const {error}=await friosSB.from('notifications').update({read:true}).eq('id',id).eq('user_id',friosUser.id);if(!error){const n=friosNotifications.find(x=>String(x.id)===String(id));if(n)n.read=true;window.FRIOS_NOTIFICATIONS=friosNotifications;if(typeof render==='function'&&page==='alerts')render();}}
async function requestFriosNotificationPermission(){if(!('Notification' in window)){uiAlert('Este dispositivo não disponibilizou notificações do navegador.','Notificações');return;}const result=await Notification.requestPermission();window.friosNotificationPermission=result;if(result==='granted'){uiToast('Notificações ativadas neste dispositivo.','success');await showBrowserNotification('Frios PA','As notificações do aplicativo estão ativadas.');}else uiAlert('As notificações continuam desativadas. Você pode permitir nas configurações do navegador/dispositivo.','Notificações');if(typeof render==='function'&&page==='alerts')render();}
async function showBrowserNotification(title,message){if(window.friosNotificationPermission!=='granted')return;try{if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.ready;await reg.showNotification(title,{body:message,icon:'notification-icon.png',badge:'notification-icon.png',tag:'frios-pa-notification'});}else new Notification(title,{body:message,icon:'notification-icon.png'});}catch(e){console.warn(e)}}
async function maybeGenerateDailySummary(){
  if(!friosUser||!friosNotificationSettings?.daily_summary_enabled)return;
  const {error}=await friosSB.rpc('frios_generate_daily_summary_for_user');
  if(error){console.warn('[FRIOS PA] Não foi possível gerar o resumo diário:',error);return;}
  await cloudLoadNotifications();
}
async function cloudInitNotifications(){await cloudLoadNotificationSettings();await cloudLoadNotifications();await maybeGenerateDailySummary();if(friosNotificationChannel)await friosSB.removeChannel(friosNotificationChannel);friosNotificationChannel=friosSB.channel('frios-notifications-live').on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${friosUser.id}`},async payload=>{const n=payload.new;friosNotifications=[n,...friosNotifications.filter(x=>x.id!==n.id)].slice(0,50);window.FRIOS_NOTIFICATIONS=friosNotifications;if(typeof render==='function'&&page==='alerts')render();if(friosNotificationSettings?.realtime_enabled!==false){uiToast(n.title,'success');if(window.friosNotificationPermission==='granted')showBrowserNotification(n.title,n.message);}}).subscribe();}

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
  await cloudLoadProducts(); await cloudInitNotifications(); cloudSubscribe();
}
async function cloudLogout(){await friosSB.auth.signOut();friosUser=null;friosProfile=null;if(friosRealtime)await friosSB.removeChannel(friosRealtime);if(friosNotificationChannel)await friosSB.removeChannel(friosNotificationChannel);$('app').classList.add('hidden');$('login').classList.remove('hidden');}
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
  const name=$('fName').value.trim(),ean=$('fEan').value.replace(/\D/g,'').trim(),date=$('fDate').value;
  const tag=$('fTag').value==='custom'?Number($('fCustomTag').value):Number($('fTag').value);
  const location=$('fLocation').value.trim(),plu=$('fPlu').checked;
  let photo=window.pendingProductPhoto||'';
  if(!name||!date||!tag){uiAlert('Preencha descrição, vencimento e tag de trabalho.','Cadastro de produto');return}
  if(ean){
    let dupQuery=friosSB.from('products').select('id,name,ean,expiration_date').eq('active',true).eq('ean',ean);
    if(editingId && editingId!=='new') dupQuery=dupQuery.neq('id',editingId);
    const dup=await dupQuery.limit(1);
    if(dup.error){console.error(dup.error);uiAlert('Não foi possível validar o código de barras agora. Verifique sua conexão e tente novamente.','Validação do produto');return}
    if(dup.data?.length){
      const d=dup.data[0];
      uiAlert(`O EAN ${ean} já está cadastrado no produto “${d.name}”. Não é permitido cadastrar o mesmo código de barras em mais de um produto ativo.`,`EAN já cadastrado`);
      return;
    }
  }
  photo=await uploadFriosPhoto(photo);
  const payload={name,ean:ean||null,brand:null,photo_url:photo||null,expiration_date:date,work_tag_days:tag,location:location||'Localização não informada',plu_identified:plu,active:true,updated_by:friosUser.id};
  let result;
  if(editingId && editingId!=='new') result=await friosSB.from('products').update(payload).eq('id',editingId).select().single();
  else result=await friosSB.from('products').insert({...payload,created_by:friosUser.id}).select().single();
  if(result.error){console.error(result.error);uiAlert(result.error.code==='23505'?'Este EAN já está cadastrado em outro produto.':'Não foi possível salvar o produto na nuvem.','Salvar produto');return}
  editingId=null; window.pendingProductPhoto=''; await cloudLoadProducts(); renderProducts();
}
async function cloudRemoveSelected(){
  const ids=products.filter(p=>p.selected).map(p=>p.id); if(!ids.length){uiAlert('Marque pelo menos um produto antes de remover.','Remover produtos');return;}
  if(!await uiConfirm(`Você está prestes a remover ${ids.length} produto(s). Essa ação não poderá ser desfeita.`, 'Remover produtos')) return;
  const {data:deleted,error}=await friosSB.from('products').delete().in('id',ids).select('id');
  if(error){
    console.error('[FRIOS PA] Erro ao remover:',error);
    const code=error.code||'ERRO';
    const detail=error.message||'O banco recusou a operação.';
    uiAlert(`Não foi possível remover o produto agora.\n\nCódigo: ${code}\n${detail}`, 'Remoção não concluída');
    return;
  }
  const deletedIds=(deleted||[]).map(r=>r.id);
  if(deletedIds.length!==ids.length){
    console.warn('[FRIOS PA] Remoção parcial', {requested:ids, deleted:deletedIds});
    await cloudLoadProducts();
    uiAlert(`A nuvem confirmou a remoção de ${deletedIds.length} de ${ids.length} produto(s). Os itens restantes continuam protegidos e foram mantidos na lista.`, 'Remoção parcial');
    return;
  }
  products=products.filter(p=>!ids.includes(p.id));
  products.forEach(p=>p.selected=false);
  uiToast(ids.length===1?'Produto removido com sucesso.':`${ids.length} produtos removidos com sucesso.`,'success');
  await cloudLoadProducts(); renderProducts();
}
async function cloudMarkPlu(value){
  const ids=products.filter(p=>p.selected).map(p=>p.id); if(!ids.length){uiAlert('Marque pelo menos um produto.','PLU');return}
  const {error}=await friosSB.from('products').update({plu_identified:value,updated_by:friosUser.id}).in('id',ids);
  if(error){uiAlert('Não foi possível atualizar o PLU.','PLU');return}
  await cloudLoadProducts(); renderProducts();
}

// Substitui o comportamento local somente quando a página estiver carregada.
window.addEventListener('load', async ()=>{
  $('u').placeholder='E-mail ou usuário';
  $('enter').onclick=cloudLogin; $('openSignup').onclick=openSignup; $('openReset').onclick=openResetPassword;
  $('out').onclick=cloudLogout;
  $('app').classList.add('hidden');
  $('login').classList.remove('hidden');
  const {data}=await friosSB.auth.getSession();
  if(data.session){
    friosUser=data.session.user; await cloudProfile();
    if(friosProfile?.active){
      $('login').classList.add('hidden');$('app').classList.remove('hidden');
      await cloudLoadProducts();await cloudInitNotifications();cloudSubscribe();
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
