const K="frios_pa_auth",D="frios_pa_data";
let products=JSON.parse(localStorage.getItem(D)||"[]");
products=products.map((p,i)=>({...p,id:p.id||`prod-${i}-${p.ean||"sem-ean"}-${p.date||""}`,location:p.location||"Localização não informada",tag:Number(p.tag)||12,plu:Boolean(p.plu),photo:p.photo||"",selected:false}));
let page="home",selectedProductId=null;
let productFilters={mode:"all",search:"",tag:"all",days:"all"};
let editingId=null;
const $=x=>document.getElementById(x);
const demo={u:"admin",p:"123456",name:"Administrador"};
function days(d){let n=new Date();n.setHours(0,0,0,0);return Math.ceil((new Date(d+"T00:00:00")-n)/86400000)}
function persist(){localStorage.setItem(D,JSON.stringify(products.map(({selected,...p})=>p)))}
function fmtDate(d){return new Date(d+"T00:00:00").toLocaleDateString("pt-BR")}
function isWork(p){let d=days(p.date);return d<=Number(p.tag)&&d>=0}
function status(p){let d=days(p.date);if(d<0)return ["Vencido","red"];if(d===0)return ["Vence hoje","red"];if(isWork(p))return [p.plu?"PLU identificado":"PLU pendente",p.plu?"green":"red"];return ["Aguardando janela",""]}
function escapeHtml(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]))}
function render(){
  let names={home:"Início",products:"Produtos",expiry:"Vencimentos",alerts:"Notificações",more:"Mais"};
  $("title").textContent=names[page];
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.p==page));
  let s=[...products].sort((a,b)=>a.date.localeCompare(b.date));
  let win=s.filter(isWork).length;
  if(page==="home"){
    $("content").innerHTML=`<p class="muted">Bom dia, ${demo.name}</p><div class="hero"><small>Produtos cadastrados</small><strong>${s.length}</strong><small>controle atual</small></div><div class="grid"><div class="card"><div class="muted">Vencem hoje</div><div class="metric">${s.filter(p=>days(p.date)==0).length}</div></div><div class="card"><div class="muted">Na janela</div><div class="metric">${win}</div></div><div class="card"><div class="muted">Próximo</div><div class="metric">${s[0]?days(s[0].date):"—"}</div></div><div class="card"><div class="muted">Alertas</div><div class="metric">Ativos</div></div></div><div class="section"><b>Resumo de vencimentos</b><div class="list">${s.slice(0,5).map(card).join("")||'<div class="card muted">Nenhum produto cadastrado.</div>'}</div></div>`;
  }else if(page==="expiry"){
    let selected=products.find(p=>p.id===selectedProductId);
    $("content").innerHTML=`<h2>Vencimentos</h2><p class="muted">Data de vencimento crescente</p>${selected?detail(selected):""}<div class="list">${s.map(card).join("")||'<div class="card muted">Nenhum vencimento cadastrado.</div>'}</div>`;
  }else if(page==="products"){
    renderProducts();
  }else if(page==="alerts"){
    $("content").innerHTML=`<h2>Notificações</h2><div class="card"><b>Resumo diário</b><p class="muted">Nesta V1, a configuração é local. Na próxima etapa será vinculada ao usuário e ao banco em nuvem.</p><input type="time" value="05:00"><br><br><button class="primary-btn" onclick="alert('Horário salvo')">Salvar configuração</button></div>`;
  }else{
    $("content").innerHTML=`<h2>Mais</h2><div class="card"><b>Conta</b><p class="muted">${demo.name}</p><p class="muted">Autenticação: Local V1</p><p class="muted">Banco em nuvem: próxima etapa</p></div>`;
  }
}
function renderProducts(){
  let q=productFilters.search.trim().toLowerCase();
  let arr=[...products].sort((a,b)=>a.date.localeCompare(b.date)).filter(p=>{
    if(productFilters.mode==="work"&&!isWork(p))return false;
    if(productFilters.mode==="critical"&&days(p.date)>7)return false;
    if(productFilters.tag!=="all"&&String(p.tag)!==String(productFilters.tag))return false;
    let d=days(p.date);
    if(productFilters.days==="0"&&d!==0)return false;
    if(productFilters.days==="1-3"&&(d<1||d>3))return false;
    if(productFilters.days==="4-7"&&(d<4||d>7))return false;
    if(productFilters.days==="8-15"&&(d<8||d>15))return false;
    if(productFilters.days==="16+"&&d<16)return false;
    if(q&&!(`${p.name} ${p.ean||""} ${p.location||""}`.toLowerCase().includes(q)))return false;
    return true;
  });
  let selectedCount=products.filter(p=>p.selected).length;
  let tags=[...new Set(products.map(p=>Number(p.tag)).filter(Boolean))].sort((a,b)=>a-b);
  $("content").innerHTML=`
    <div class="products-title-row"><div><h2>Seus produtos</h2><p class="muted">Filtre por categoria, pesquise por nome ou EAN e controle a validade por tag.</p></div><span class="count-badge">${arr.length} produtos</span></div>
    <div class="product-toolbar">
      <div class="product-tabs">
        <button class="filter-tab ${productFilters.mode==="all"?"active":""}" onclick="setProductMode('all')">Todos</button>
        <button class="filter-tab ${productFilters.mode==="work"?"active":""}" onclick="setProductMode('work')">Trabalho</button>
        <button class="filter-tab ${productFilters.mode==="critical"?"active":""}" onclick="setProductMode('critical')">Lista crítica</button>
      </div>
      <div class="product-search-row">
        <label class="search-box"><span class="icon-search"></span><input id="productSearch" value="${escapeHtml(productFilters.search)}" placeholder="Buscar por nome ou EAN..." oninput="productSearch(this.value)"></label>
        <select onchange="setProductTag(this.value)" aria-label="Filtrar por tag"><option value="all">Todas as tags</option>${tags.map(t=>`<option value="${t}" ${String(productFilters.tag)===String(t)?"selected":""}>Tag ${t} dias</option>`).join("")}</select>
        <select onchange="setProductDays(this.value)" aria-label="Filtrar por validade"><option value="all">Todas as validades</option><option value="0" ${productFilters.days==="0"?"selected":""}>Vence hoje</option><option value="1-3" ${productFilters.days==="1-3"?"selected":""}>1 a 3 dias</option><option value="4-7" ${productFilters.days==="4-7"?"selected":""}>4 a 7 dias</option><option value="8-15" ${productFilters.days==="8-15"?"selected":""}>8 a 15 dias</option><option value="16+" ${productFilters.days==="16+"?"selected":""}>16+ dias</option></select>
      </div>
      <div class="product-actions-row"><label class="select-all"><input type="checkbox" ${arr.length&&arr.every(p=>p.selected)?"checked":""} onchange="toggleAllVisible(this.checked)"> Selecionar tudo</label><span class="selection-info">${selectedCount?selectedCount+" selecionado(s)":""}</span><button class="ghost-btn" onclick="clearProductFilters()">Limpar filtros</button></div>
      ${selectedCount?`<div class="bulk-bar"><span>${selectedCount} produto(s) selecionado(s)</span><button onclick="clearSelection()">Desmarcar</button></div>`:""}
    </div>
    <div class="product-list">${arr.map(productRow).join("")||`<div class="empty-card"><b>Nenhum produto encontrado</b><span>Altere os filtros ou cadastre um novo produto.</span></div>`}</div>
    ${fabHtml()}
    ${editingId?modalHtml():""}`;
}
function productRow(p){
  let d=days(p.date),tag=Number(p.tag)||12,work=isWork(p);
  let daysText=d<0?`${Math.abs(d)} dias vencido`:d===0?"Vence hoje":`${d} dias restantes`;
  let pluLabel=work?(p.plu?`TAG ${tag}D - PLU`:`TAG ${tag}D - PLU`):`TAG ${tag}D`;
  let pluClass=work?(p.plu?"plu-ok":"plu-pending"):"plu-wait";
  let pluText=work?(p.plu?"PLU identificado":"PLU pendente"):("Aguardando janela");
  return `<div class="product-row ${p.selected?"selected":""}"><input class="row-check" type="checkbox" ${p.selected?"checked":""} onchange="toggleProduct('${escapeHtml(p.id)}',this.checked)"><div class="row-thumb">${p.photo?`<img src="${p.photo}" alt="">`:""}</div><button class="row-main" onclick="openProduct('${escapeHtml(p.id)}')"><b>${escapeHtml(p.name)}</b><span>EAN ${escapeHtml(p.ean||"não informado")} · Vence ${fmtDate(p.date)}</span><span>${escapeHtml(p.location||"Localização não informada")}</span><span class="mobile-plu ${pluClass}">${pluLabel} · ${pluText}</span></button><div class="row-tag"><span class="${pluClass}">${pluLabel}</span><small>${pluText}</small></div><div class="row-days ${d<=3?"urgent":d<=7?"attention":""}"><strong>${d<0?"Vencido":d===0?"Hoje":d+"d"}</strong><small>${daysText}</small></div></div>`;
}
function modalHtml(){let p=products.find(x=>x.id===editingId)||{name:"",ean:"",date:new Date().toISOString().slice(0,10),tag:12,location:"",plu:false,photo:""};let editing=!!products.find(x=>x.id===editingId);return `<div class="modal-backdrop" onclick="closeProductModal(event)"><div class="modal" onclick="event.stopPropagation()"><div class="modal-head"><div><h3>${editing?"Editar produto":"Criar produto"}</h3><p class="muted">Cadastre a validade, a tag, o EAN e a foto do produto.</p></div><button class="close-btn" onclick="closeProductModal()">×</button></div><div class="form-grid"><label>Descrição<input id="fName" value="${escapeHtml(p.name)}" placeholder="Nome do produto"></label><label>EAN<div class="ean-input"><input id="fEan" value="${escapeHtml(p.ean)}" inputmode="numeric" placeholder="Código de barras" onkeydown="if(event.key==='Enter'){event.preventDefault();lookupProductByEan()}"><button type="button" class="scan-btn" onclick="startEanScanner()" title="Ler EAN">Ler EAN</button></div><div class="ean-lookup-row"><button type="button" class="lookup-btn" onclick="lookupProductByEan()">Consultar produto</button><span id="eanLookupStatus" class="field-hint">Digite ou leia o EAN para buscar nome e foto na internet.</span></div></label><label>Foto do produto<div class="photo-field"><div id="photoPreview" class="photo-preview">${p.photo?`<img src="${p.photo}" alt="Foto do produto">`:`<span>Sem foto</span>`}</div><div class="photo-actions"><button type="button" class="ghost-btn" onclick="document.getElementById('fPhoto').click()">Tirar / escolher foto</button>${p.photo?`<button type="button" class="remove-photo" onclick="clearProductPhoto()">Remover foto</button>`:""}</div><input id="fPhoto" class="file-hidden" type="file" accept="image/*" capture="environment" onchange="handleProductPhoto(this)"></div></label><label>Data de vencimento<input id="fDate" type="date" value="${escapeHtml(p.date)}"></label><label>Tag de trabalho<select id="fTag"><option value="7">7 dias</option><option value="10">10 dias</option><option value="12">12 dias</option><option value="15">15 dias</option><option value="17">17 dias</option><option value="20">20 dias</option><option value="30">30 dias</option><option value="custom">Outro</option></select></label><label id="customTagWrap" class="hidden">Outra tag<input id="fCustomTag" type="number" min="1" value="${Number(p.tag)||12}"></label><label class="full">Localização no setor<input id="fLocation" value="${escapeHtml(p.location)}" placeholder="Ex.: Balcão de frios · Expositor 01"></label><label class="plu-check full"><input id="fPlu" type="checkbox" ${p.plu?"checked":""}> Produto já está identificado com PLU</label></div><div class="modal-foot"><button class="ghost-btn" onclick="closeProductModal()">Cancelar</button><button class="primary-btn" onclick="saveProduct()">Salvar produto</button></div></div></div>`}
function handleProductPhoto(input){let file=input.files&&input.files[0];if(!file)return;let reader=new FileReader();reader.onload=()=>{let img=new Image();img.onload=()=>{let max=700,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);window.pendingProductPhoto=c.toDataURL('image/jpeg',.78);let prev=$('photoPreview');if(prev)prev.innerHTML=`<img src="${window.pendingProductPhoto}" alt="Foto do produto">`;};img.src=reader.result};reader.readAsDataURL(file)}
function clearProductPhoto(){window.pendingProductPhoto="";let prev=$('photoPreview');if(prev)prev.innerHTML='<span>Sem foto</span>';}
function openEanCameraModal(){if($('eanScannerModal'))return;document.body.insertAdjacentHTML('beforeend',`<div id="eanScannerModal" class="modal-backdrop scanner-backdrop"><div class="scanner-modal"><div class="modal-head"><div><h3>Ler EAN</h3><p class="muted">Aponte a câmera para o código de barras.</p></div><button class="close-btn" onclick="stopEanScanner()">×</button></div><div class="scanner-view"><video id="eanVideo" autoplay playsinline muted></video><div class="scanner-frame"></div></div><div id="eanScannerMsg" class="scanner-msg">Iniciando câmera…</div><div class="scanner-manual"><input id="eanManual" inputmode="numeric" placeholder="Ou digite o EAN"><button class="primary-btn" onclick="useManualEan()">Usar EAN</button></div></div></div>`)}
async function lookupProductByEan(silent=false){
  const input=$("fEan");
  const statusEl=$("eanLookupStatus");
  const ean=(input?.value||"").replace(/\D/g,"");
  if(!ean){if(statusEl){statusEl.textContent="Informe ou leia um EAN primeiro.";statusEl.className="field-hint lookup-error";}return null}
  if(statusEl){statusEl.textContent="Consultando produto…";statusEl.className="field-hint lookup-loading";}
  try{
    const url=`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=code,product_name,product_name_pt,brands,image_front_url,image_url`;
    const res=await fetch(url,{headers:{"Accept":"application/json"}});
    if(!res.ok)throw new Error("HTTP "+res.status);
    const data=await res.json();
    if(data.status!==1||!data.product){
      if(statusEl){statusEl.textContent="Produto não encontrado. Você pode preencher os dados manualmente.";statusEl.className="field-hint lookup-error";}
      return null;
    }
    const prod=data.product||{};
    const name=(prod.product_name_pt||prod.product_name||"").trim();
    const brand=(prod.brands||"").trim();
    const finalName=name||(brand?brand:"Produto não identificado");
    const nameEl=$("fName");
    if(nameEl&&!nameEl.value.trim()) nameEl.value=finalName;
    else if(nameEl&&nameEl.dataset.autoFilled==="1") nameEl.value=finalName;
    if(nameEl)nameEl.dataset.autoFilled="1";
    const photo=prod.image_front_url||prod.image_url||"";
    if(photo&&!window.pendingProductPhoto){
      window.pendingProductPhoto=photo;
      const prev=$("photoPreview");
      if(prev)prev.innerHTML=`<img src="${escapeHtml(photo)}" alt="Foto do produto encontrado na internet">`;
    }
    if(statusEl){statusEl.textContent=`Produto encontrado${brand?` · ${brand}`:""}. Nome e foto preenchidos automaticamente.`;statusEl.className="field-hint lookup-ok";}
    return {ean:prod.code||ean,name:finalName,photo};
  }catch(err){
    if(statusEl){statusEl.textContent="Não foi possível consultar a base de produtos agora. Preencha manualmente.";statusEl.className="field-hint lookup-error";}
    return null;
  }
}
function openEanCameraModal(){if($("eanScannerModal"))return;document.body.insertAdjacentHTML("beforeend",`<div id="eanScannerModal" class="modal-backdrop scanner-backdrop"><div class="scanner-modal"><div class="modal-head"><div><h3>Ler EAN</h3><p class="muted">Aponte a câmera para o código de barras.</p></div><button class="close-btn" onclick="stopEanScanner()">×</button></div><div class="scanner-view"><video id="eanVideo" autoplay playsinline muted></video><div class="scanner-frame"></div></div><div id="eanScannerMsg" class="scanner-msg">Iniciando câmera…</div><div class="scanner-manual"><input id="eanManual" inputmode="numeric" placeholder="Ou digite o EAN"><button class="primary-btn" onclick="useManualEan()">Usar EAN</button></div></div></div>`)}
async function startEanScanner(){openEanCameraModal();let msg=$("eanScannerMsg");try{window.eanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});let v=$("eanVideo");v.srcObject=window.eanStream;await v.play();if("BarcodeDetector" in window){let formats=["ean_13","ean_8","upc_a","upc_e","code_128","code_39","itf"];let detector;try{detector=new BarcodeDetector({formats})}catch(_){detector=new BarcodeDetector()}window.eanScanActive=true;msg.textContent="Aguardando leitura…";const scan=async()=>{if(!window.eanScanActive)return;try{let codes=await detector.detect(v);if(codes&&codes.length&&codes[0].rawValue){const value=codes[0].rawValue;$("fEan").value=value;msg.textContent="EAN identificado. Consultando produto…";stopEanScanner();await lookupProductByEan();return}}catch(_){}requestAnimationFrame(scan)};requestAnimationFrame(scan)}else{msg.textContent="Seu navegador não disponibilizou leitura automática. Digite o EAN abaixo ou use um leitor físico."}}catch(err){msg.textContent="Não foi possível acessar a câmera. Verifique a permissão do navegador."}}
async function useManualEan(){let v=$("eanManual")?.value.trim().replace(/\D/g,"");if(v){$("fEan").value=v;stopEanScanner();await lookupProductByEan()}}
function stopEanScanner(){window.eanScanActive=false;if(window.eanStream){window.eanStream.getTracks().forEach(t=>t.stop());window.eanStream=null}let m=$("eanScannerModal");if(m)m.remove()}
function openProductModal(id=""){
  editingId=id||"new";
  let existing=products.find(x=>x.id===id);
  window.pendingProductPhoto=existing?existing.photo||"":"";
  renderProducts();
  setTimeout(()=>{
    let p=products.find(x=>x.id===id);
    let tag=p?Number(p.tag):12;
    let sel=$("fTag");
    if(sel){
      let opt=[...sel.options].find(o=>Number(o.value)===tag);
      if(opt){
        sel.value=String(tag);
      }else{
        sel.value="custom";
        $("customTagWrap").classList.remove("hidden");
        $("fCustomTag").value=tag;
      }
      sel.onchange=()=>$("customTagWrap").classList.toggle("hidden",sel.value!=="custom");
    }
  },0);
}
function closeProductModal(e){if(e&&e.target!==e.currentTarget)return;editingId=null;renderProducts()}
function saveProduct(){let name=$("fName").value.trim(),ean=$("fEan").value.trim(),date=$("fDate").value,tag=$("fTag").value==="custom"?Number($("fCustomTag").value):Number($("fTag").value),location=$("fLocation").value.trim(),plu=$("fPlu").checked,photo=window.pendingProductPhoto||"";if(!name||!date||!tag){alert("Preencha descrição, vencimento e tag de trabalho.");return}if(editingId&&editingId!=="new"){let p=products.find(x=>x.id===editingId);Object.assign(p,{name,ean,date,tag,location:location||"Localização não informada",plu,photo})}else products.push({id:`prod-${Date.now()}`,name,ean,date,tag,location:location||"Localização não informada",plu,photo,selected:false});persist();editingId=null;renderProducts()}
function removeProduct(id){let p=products.find(x=>x.id===id);if(!p)return;if(confirm(`Remover ${p.name}?`)){products=products.filter(x=>x.id!==id);persist();renderProducts()}}
function removeSelected(){let n=products.filter(p=>p.selected).length;if(!n)return;if(confirm(`Remover ${n} produto(s) selecionado(s)?`)){products=products.filter(p=>!p.selected);persist();renderProducts()}}
function toggleProduct(id,v){let p=products.find(x=>x.id===id);if(p)p.selected=v;persist();renderProducts()}
function toggleAllVisible(v){let q=productFilters.search.trim().toLowerCase();products.forEach(p=>{let d=days(p.date);let ok=(productFilters.mode==="all"||(productFilters.mode==="work"&&isWork(p))||(productFilters.mode==="critical"&&d<=7))&&(productFilters.tag==="all"||String(p.tag)===String(productFilters.tag))&&(productFilters.days==="all"||(productFilters.days==="0"&&d===0)||(productFilters.days==="1-3"&&d>=1&&d<=3)||(productFilters.days==="4-7"&&d>=4&&d<=7)||(productFilters.days==="8-15"&&d>=8&&d<=15)||(productFilters.days==="16+"&&d>=16))&&(!q||`${p.name} ${p.ean||""} ${p.location||""}`.toLowerCase().includes(q));if(ok)p.selected=v});persist();renderProducts()}
function clearSelection(){products.forEach(p=>p.selected=false);persist();renderProducts()}
function setProductMode(v){productFilters.mode=v;renderProducts()}
function setProductTag(v){productFilters.tag=v;renderProducts()}
function setProductDays(v){productFilters.days=v;renderProducts()}
function productSearch(v){productFilters.search=v;renderProducts();let el=$("productSearch");if(el){el.focus();el.setSelectionRange(v.length,v.length)}}
function clearProductFilters(){productFilters={mode:"all",search:"",tag:"all",days:"all"};renderProducts()}
function toggleFab(){let m=$("fabMenu");if(m)m.classList.toggle("open")}
function selectedProducts(){return products.filter(p=>p.selected)}
function fabAction(action){
  let sel=selectedProducts();
  if(action==="create"){toggleFab();openProductModal();return}
  if(action==="plu"){if(!sel.length){alert("Marque pelo menos um produto para identificar o PLU.");return}sel.forEach(p=>p.plu=true);persist();renderProducts();return}
  if(action==="unplu"){if(!sel.length){alert("Marque pelo menos um produto para retirar o PLU.");return}sel.forEach(p=>p.plu=false);persist();renderProducts();return}
  if(action==="edit"){if(sel.length!==1){alert("Marque apenas um produto para editar.");return}toggleFab();openProductModal(sel[0].id);return}
  if(action==="remove"){removeSelected();return}
}
function fabHtml(){return `<div class="fab-wrap"><div id="fabMenu" class="fab-menu"><button onclick="fabAction('create')"><span>+</span><b>Criar produto</b></button><button onclick="fabAction('plu')"><span>✓</span><b>Marcar PLU</b></button><button onclick="fabAction('unplu')"><span>−</span><b>Retirar PLU</b></button><button onclick="fabAction('edit')"><span>✎</span><b>Editar selecionado</b></button><button onclick="fabAction('remove')"><span>×</span><b>Remover selecionados</b></button></div><button class="fab" onclick="toggleFab()" aria-label="Ferramentas"><span class="fab-line"></span><span class="fab-line"></span><span class="fab-line"></span></button></div>`}
function detail(p){let d=days(p.date),w=isWork(p);return `<div class="product-detail"><div class="detail-head"><div class="detail-photo">${p.photo?`<img src="${p.photo}" alt="Foto de ${escapeHtml(p.name)}">`:`<span>Sem foto</span>`}</div><div><small class="muted">Detalhes do produto</small><h3>${escapeHtml(p.name)}</h3><span class="pill ${w?(p.plu?"green":"red"):""}">${w?(p.plu?"PLU identificado":"PLU pendente"):"Aguardando janela"}</span></div></div><div class="detail-grid"><div><small>Vencimento</small><b>${fmtDate(p.date)}</b></div><div><small>Dias restantes</small><b>${d>=0?d+" dias":"Vencido"}</b></div><div><small>Tag de trabalho</small><b>${p.tag} dias</b></div><div><small>EAN</small><b>${escapeHtml(p.ean||"Não informado")}</b></div></div><div class="location"><small>Localização no setor</small><b>${escapeHtml(p.location||"Localização não informada")}</b></div></div>`}
function card(p){let d=days(p.date),w=isWork(p);return `<button class="item product-card" onclick="openProduct('${escapeHtml(p.id)}')"><div class="thumb">${p.photo?`<img src="${p.photo}" alt="">`:""}</div><div class="product-main"><b>${escapeHtml(p.name)}</b><div class="muted">EAN ${escapeHtml(p.ean||"não informado")} · ${fmtDate(p.date)}</div><span class="pill ${w?(p.plu?"green":"red"):""}">${w?(p.plu?"PLU identificado":"PLU pendente"):"Aguardando janela"} · Tag ${p.tag}d</span></div><div class="days ${d<=3?"urgent-text":""}">${d>=0?d+"d":"Vencido"}</div></button>`}
function openProduct(id){selectedProductId=id;page="expiry";render();window.scrollTo({top:0,behavior:"smooth"})}
function add(){openProductModal()}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{page=b.dataset.p;selectedProductId=null;render()});
$("enter").onclick=()=>{let e=$("err");e.classList.add("hidden");if($("u").value===demo.u&&$("p").value===demo.p){localStorage.setItem(K,"1");$("login").classList.add("hidden");$("app").classList.remove("hidden");render()}else{e.textContent="Usuário/senha incorreta";e.classList.remove("hidden");$("p").focus()}};
$('out').onclick=()=>{localStorage.removeItem(K);$('app').classList.add('hidden');$('login').classList.remove('hidden')};
if(localStorage.getItem(K)){$("app").classList.remove("hidden");render()}else{$("login").classList.remove("hidden")};
persist();
