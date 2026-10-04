const K="frios_pa_auth",D="frios_pa_data";
let products=JSON.parse(localStorage.getItem(D)||"[]");
products=products.map((p,i)=>({...p,id:p.id||`prod-${i}-${p.ean||"sem-ean"}-${p.date||""}`,location:p.location||"Localização não informada"}));
let page="home",selectedProductId=null;
const $=x=>document.getElementById(x);
const demo={u:"admin",p:"123456",name:"Administrador"};
function days(d){let n=new Date();n.setHours(0,0,0,0);return Math.ceil((new Date(d+"T00:00:00")-n)/86400000)}
function persist(){localStorage.setItem(D,JSON.stringify(products))}
function render(){
  let names={home:"Início",products:"Produtos",expiry:"Vencimentos",alerts:"Notificações",more:"Mais"};
  $("title").textContent=names[page];
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.p==page));
  let s=[...products].sort((a,b)=>a.date.localeCompare(b.date));
  let win=s.filter(p=>days(p.date)<=p.tag&&days(p.date)>=0).length;
  if(page==="home"){
    $("content").innerHTML=`<p class="muted">Bom dia, ${demo.name}</p><div class="hero"><small>Produtos cadastrados</small><strong>${s.length}</strong><small>controle atual</small></div><div class="grid"><div class="card"><div class="muted">Vencem hoje</div><div class="metric">${s.filter(p=>days(p.date)==0).length}</div></div><div class="card"><div class="muted">Na janela</div><div class="metric">${win}</div></div><div class="card"><div class="muted">Próximo</div><div class="metric">${s[0]?days(s[0].date):"—"}</div></div><div class="card"><div class="muted">Alertas</div><div class="metric">Ativos</div></div></div><div class="section"><b>Resumo de vencimentos</b><div class="list">${s.slice(0,5).map(card).join("")||'<div class="card muted">Nenhum produto cadastrado.</div>'}</div></div>`;
  }else if(page==="expiry"){
    let selected=products.find(p=>p.id===selectedProductId);
    $("content").innerHTML=`<h2>Vencimentos</h2><p class="muted">Data de vencimento crescente</p>${selected?detail(selected):""}<div class="list">${s.map(card).join("")||'<div class="card muted">Nenhum vencimento cadastrado.</div>'}</div>`;
  }else if(page==="products"){
    $("content").innerHTML=`<h2>Produtos</h2><button onclick="add()" style="width:100%;padding:14px;border:0;border-radius:14px;background:#2e7dd1;color:white;font-weight:800">Cadastrar produto de teste</button><div class="list">${s.map(card).join("")||'<div class="card muted">Nenhum produto cadastrado.</div>'}</div>`;
  }else if(page==="alerts"){
    $("content").innerHTML=`<h2>Notificações</h2><div class="card"><b>Resumo diário</b><p class="muted">Nesta V1, a configuração é local. Na próxima etapa será vinculada ao usuário e ao banco em nuvem.</p><input type="time" value="05:00"><br><br><button onclick="alert('Horário salvo')">Salvar configuração</button></div>`;
  }else{
    $("content").innerHTML=`<h2>Mais</h2><div class="card"><b>Conta</b><p class="muted">${demo.name}</p><p class="muted">Autenticação: Local V1</p><p class="muted">Banco em nuvem: próxima etapa</p></div>`
  }
}
function detail(p){
  let d=days(p.date),w=d<=p.tag&&d>=0;
  return `<div class="product-detail"><div class="detail-head"><div class="detail-photo"></div><div><small class="muted">Detalhes do produto</small><h3>${p.name}</h3><span class="pill ${w?"green":""}">${w?"Liberado":"Aguardando janela"}</span></div></div><div class="detail-grid"><div><small>Vencimento</small><b>${new Date(p.date+"T00:00:00").toLocaleDateString("pt-BR")}</b></div><div><small>Dias restantes</small><b>${d>=0?d+" dias":"Vencido"}</b></div><div><small>Tag de trabalho</small><b>${p.tag} dias</b></div><div><small>EAN</small><b>${p.ean||"Não informado"}</b></div></div><div class="location"><small>Localização no setor</small><b>${p.location||"Localização não informada"}</b></div></div>`
}
function card(p){
  let d=days(p.date),w=d<=p.tag&&d>=0;
  return `<button class="item product-card" onclick="openProduct('${String(p.id).replace(/'/g,"\\'")}')"><div class="thumb"></div><div class="product-main"><b>${p.name}</b><div class="muted">EAN ${p.ean||"não informado"} · ${new Date(p.date+"T00:00:00").toLocaleDateString("pt-BR")}</div><span class="pill ${w?"green":""}">${w?"Liberado":"Aguardando janela"} · Tag ${p.tag}d</span></div><div class="days">${d>=0?d+"d":"Vencido"}</div></button>`
}
function openProduct(id){selectedProductId=id;page="expiry";render();window.scrollTo({top:0,behavior:"smooth"})}
function add(){let d=new Date();d.setDate(d.getDate()+8);products.push({id:`prod-${Date.now()}`,name:"Produto de teste",ean:"7890000000000",date:d.toISOString().slice(0,10),tag:12,location:"Balcão de Frios — Expositor 01"});persist();render()}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{page=b.dataset.p;selectedProductId=null;render()});
$("enter").onclick=()=>{let e=$("err");e.classList.add("hidden");if($("u").value===demo.u&&$("p").value===demo.p){localStorage.setItem(K,"1");$("login").classList.add("hidden");$("app").classList.remove("hidden");render()}else{e.textContent="Usuário/senha incorreta";e.classList.remove("hidden");$("p").focus()}};
$('out').onclick=()=>{localStorage.removeItem(K);$('app').classList.add('hidden');$('login').classList.remove('hidden')};
if(localStorage.getItem(K)){$("app").classList.remove("hidden");render()}else{$("login").classList.remove("hidden")};
persist();
