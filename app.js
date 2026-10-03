const KEY="frios_pa_local_v1";
const state={page:"home", products:[], settings:{notify:true,time:"05:00"}};

function load(){
  try{const s=JSON.parse(localStorage.getItem(KEY)); if(s){state.products=s.products||[];state.settings={...state.settings,...(s.settings||{})}}}catch(e){}
}
function save(){localStorage.setItem(KEY,JSON.stringify({products:state.products,settings:state.settings}))}
function daysLeft(date){
  const now=new Date(); now.setHours(0,0,0,0);
  const d=new Date(date+"T00:00:00"); return Math.ceil((d-now)/86400000);
}
function workDate(date,tag){
  const d=new Date(date+"T00:00:00"); d.setDate(d.getDate()-Number(tag));
  return d.toLocaleDateString("pt-BR");
}
function status(p){
  const days=daysLeft(p.expiryDate);
  if(days<0)return ["Vencido","red"];
  if(days<=3)return ["Crítico","red"];
  if(days<=7)return ["Próximo","yellow"];
  return ["Normal","green"];
}
function pageTitle(){
  return {home:"Início",products:"Produtos",expiry:"Vencimentos",notifications:"Alertas",settings:"Configurações"}[state.page];
}
function render(){
  document.getElementById("pageTitle").textContent=pageTitle();
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page));
  const c=document.getElementById("content");
  if(state.page==="home")c.innerHTML=home();
  if(state.page==="products")c.innerHTML=products();
  if(state.page==="expiry")c.innerHTML=expiry();
  if(state.page==="notifications")c.innerHTML=notifications();
  if(state.page==="settings")c.innerHTML=settings();
  bind();
}
function home(){
  const sorted=[...state.products].sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate));
  const next=sorted[0], today=sorted.filter(p=>daysLeft(p.expiryDate)===0).length;
  const windowNow=state.products.filter(p=>daysLeft(p.expiryDate)<=Number(p.tag)&&daysLeft(p.expiryDate)>=0).length;
  return `<div class="hero"><div class="small">Controle de vencimentos</div><strong>${state.products.length}</strong><div>produtos cadastrados</div></div>
  <div class="grid">
    <div class="card"><div class="muted">Vencem hoje</div><div class="metric">${today}</div></div>
    <div class="card"><div class="muted">Na janela de trabalho</div><div class="metric">${windowNow}</div></div>
    <div class="card"><div class="muted">Próximo vencimento</div><div class="metric">${next?daysLeft(next.expiryDate):"—"}</div></div>
    <div class="card"><div class="muted">Resumo diário</div><div class="metric">${state.settings.notify?"Ativo":"Off"}</div></div>
  </div>
  <div class="section-title"><h3>Próximos vencimentos</h3><button class="secondary-btn" id="goExpiry">Ver todos</button></div>
  ${next?`<div class="product-list">${sorted.slice(0,4).map(productCard).join("")}</div>`:`<div class="card empty">Nenhum produto cadastrado.</div>`}`;
}
function products(){
  return `<button class="primary-btn" id="addProduct">+ Cadastrar produto</button>
  <div class="section-title"><h3>Produtos cadastrados</h3></div>
  <input class="search" id="search" placeholder="Pesquisar produto ou EAN">
  <div class="product-list" id="productList">${state.products.length?state.products.map(productCard).join(""):`<div class="card empty">Nenhum produto cadastrado.</div>`}</div>`;
}
function expiry(){
  const sorted=[...state.products].sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate));
  return `<div class="card" style="margin-bottom:12px"><div class="muted">Ordenação</div><strong>Data de vencimento crescente</strong></div>
  <div class="product-list">${sorted.length?sorted.map(productCard).join(""):`<div class="card empty">Nenhum vencimento cadastrado.</div>`}</div>`;
}
function notifications(){
  return `<div class="card">
    <div class="eyebrow">Resumo diário</div>
    <h2>Notificações</h2>
    <div class="setting"><span>Receber resumo diário</span><input id="notify" type="checkbox" ${state.settings.notify?"checked":""}></div>
    <div class="setting"><span>Horário</span><input class="time-input" id="notifyTime" type="time" value="${state.settings.time}"></div>
    <p class="muted">Nesta V1 local, a configuração fica salva no aparelho. Na próxima etapa ela será vinculada ao usuário e ao sistema de notificações em nuvem.</p>
    <button class="primary-btn" id="saveNotify">Salvar configuração</button>
  </div>
  <div class="section-title"><h3>Prévia do resumo</h3></div>
  <div class="card">${notificationPreview()}</div>`;
}
function notificationPreview(){
  const s=[...state.products].sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate)).slice(0,6);
  if(!s.length)return `<div class="empty">Cadastre produtos para visualizar o resumo.</div>`;
  return `<strong>Frios PA — Vencimentos</strong><div class="muted" style="margin-top:8px">${s.length} produto(s) no resumo atual.</div>${s.map(p=>`<div class="setting"><span>${escapeHtml(p.description)}</span><b>${daysLeft(p.expiryDate)} dias</b></div>`).join("")}`;
}
function settings(){
  return `<div class="card">
    <div class="eyebrow">Sistema</div><h2>Configurações</h2>
    <div class="setting"><span>Versão</span><strong>V1 Local</strong></div>
    <div class="setting"><span>Armazenamento</span><strong>Local</strong></div>
    <div class="setting"><span>Banco em nuvem</span><strong>Próxima etapa</strong></div>
    <div class="setting"><span>Realtime</span><strong>Próxima etapa</strong></div>
  </div>
  <div class="section-title"><h3>Dados de teste</h3></div>
  <button class="secondary-btn" id="clearData">Limpar produtos locais</button>`;
}
function productCard(p){
  const dl=daysLeft(p.expiryDate), st=status(p), inWindow=dl<=Number(p.tag)&&dl>=0;
  const photo=p.photo?`<img class="product-photo" src="${p.photo}" alt="">`:`<div class="product-photo"></div>`;
  return `<div class="product">${photo}<div class="product-main"><div class="product-name">${escapeHtml(p.description)}</div><div class="muted">${p.ean||"EAN não informado"} · Vence ${new Date(p.expiryDate+"T00:00:00").toLocaleDateString("pt-BR")}</div><div class="product-meta"><span class="pill">Tag ${p.tag} dias</span><span class="pill ${inWindow?"green":"yellow"}">${inWindow?"Liberado":"Aguardando janela"}</span><span class="pill ${st[1]}">${st[0]}</span></div></div><div class="days">${dl>=0?dl+"d":"Vencido"}</div></div>`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function openModal(){document.getElementById("productModal").classList.remove("hidden")}
function closeModal(){document.getElementById("productModal").classList.add("hidden")}
function bind(){
  document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render()});
  document.getElementById("refreshBtn").onclick=()=>{load();render()};
  const add=document.getElementById("addProduct"); if(add)add.onclick=openModal;
  const go=document.getElementById("goExpiry"); if(go)go.onclick=()=>{state.page="expiry";render()};
  const search=document.getElementById("search"); if(search)search.oninput=()=>{const q=search.value.toLowerCase();document.getElementById("productList").innerHTML=state.products.filter(p=>(p.description+" "+p.ean).toLowerCase().includes(q)).map(productCard).join("")||`<div class="card empty">Nenhum resultado.</div>`};
  const saveN=document.getElementById("saveNotify"); if(saveN)saveN.onclick=()=>{state.settings.notify=document.getElementById("notify").checked;state.settings.time=document.getElementById("notifyTime").value;save();render()};
  const clear=document.getElementById("clearData"); if(clear)clear.onclick=()=>{if(confirm("Limpar os produtos locais?")){state.products=[];save();render()}};
}
document.getElementById("closeModal").onclick=closeModal;
document.getElementById("photo").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>document.getElementById("photoPreview").innerHTML=`<img src="${r.result}" alt="">`;r.readAsDataURL(f)};
document.getElementById("productForm").onsubmit=e=>{
  e.preventDefault();
  const file=document.getElementById("photo").files[0];
  const finish=(photo="")=>{
    state.products.push({id:Date.now(),description:document.getElementById("description").value.trim(),ean:document.getElementById("ean").value.trim(),expiryDate:document.getElementById("expiryDate").value,tag:Number(document.getElementById("tag").value),photo});
    save();e.target.reset();document.getElementById("photoPreview").textContent="Nenhuma foto selecionada";closeModal();state.page="products";render();
  };
  if(file){const r=new FileReader();r.onload=()=>finish(r.result);r.readAsDataURL(file)}else finish();
};
load();render();
