
const K="patatogo-"+window.UID,$=s=>document.querySelector(s),MAXE=10,REGEN=15*6e4;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const ic=(n,s=22)=>`<svg class="ic" width="${s}" height="${s}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const DEF=()=>({coins:100,owned:{},cards:[],nick:"Joueur"+Math.floor(1000+Math.random()*9000),friends:[],club:"",gifted:{},log:[],stats:{hands:0,wins:0},en:{n:5,t:Date.now()},
rarities:[{id:"r1",name:"Commune",color:"#8C96A3",weight:60,pts:1},{id:"r2",name:"Rare",color:"#2F80ED",weight:25,pts:2},{id:"r3",name:"Épique",color:"#9B51E0",weight:10,pts:4},{id:"r4",name:"Légendaire",color:"#F2A900",weight:4,pts:8},{id:"r5",name:"Mythique",color:"#E8452C",weight:1,pts:16}],
set:{price:30,size:3,daily:50,last:0,pin:"0000"}});
let S=DEF();try{const o=JSON.parse(localStorage.getItem(K));if(o&&o.set){S=Object.assign(DEF(),o);S.set=Object.assign(DEF().set,o.set)}}catch(e){}
S.rarities.forEach((r,i)=>{if(r.pts==null)r.pts=[1,2,4,8,16][i]||i+1});S.stats=S.stats||{hands:0,wins:0};
function save(){try{localStorage.setItem(K,JSON.stringify(S))}catch(e){toast("Stockage plein : supprime des cartes ou fais une sauvegarde.")}pushProfile()}
let tab="play",filt="all",sub="cards",ss="friends",unlocked=false,pend=null,spinning=false,lastMsg="Lance la machine à chips !";
let db=null,me=null,players={},clubs={},pt=0;
const rar=id=>S.rarities.find(r=>r.id===id)||{name:"?",color:"#999",weight:0};
function toast(t){const d=document.createElement("div");d.className="toast";d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2800)}
const nCards=()=>Object.keys(S.owned).filter(id=>S.cards.some(c=>c.id===id)).length;
function addLog(t){S.log.unshift(t);S.log=S.log.slice(0,8)}

/* PWA */
try{const icon="data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="#FFD23F"/><path d="M26 104c0-42 42-72 92-64 40 8 60 40 46 72s-66 48-106 32c-22-8-32-24-32-40z" fill="#E8452C" stroke="#1B1F5E" stroke-width="9"/><path d="M62 98c20-20 50-20 74 0" fill="none" stroke="#1B1F5E" stroke-width="9" stroke-linecap="round"/></svg>');
$("#mf").href=URL.createObjectURL(new Blob([JSON.stringify({name:"Patatogo",short_name:"Patatogo",display:"standalone",start_url:".",background_color:"#FFD23F",theme_color:"#FFD23F",icons:[{src:icon,sizes:"192x192",type:"image/svg+xml"}]})],{type:"application/manifest+json"}))}catch(e){}

/* énergie */
function en(){if(S.en.n>=MAXE){S.en.t=Date.now();return S.en.n}const k=Math.floor((Date.now()-S.en.t)/REGEN);if(k>0){S.en.n=Math.min(MAXE,S.en.n+k);S.en.t=S.en.n>=MAXE?Date.now():S.en.t+k*REGEN}return S.en.n}
function enTxt(){if(en()>=MAXE)return"Énergie pleine";const s=Math.max(0,Math.ceil((REGEN-(Date.now()-S.en.t))/1e3));return"+1 dans "+Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
setInterval(()=>{const e=$("#entxt");if(e&&!spinning)e.textContent=enTxt()},1000);

/* ligne sociale (base partagée si disponible) */
function pushProfile(){if(!db||!me)return;clearTimeout(pt);pt=setTimeout(()=>{db.doc("players/"+me).set({nick:S.nick,coins:S.coins,cards:nCards(),club:S.club,friends:S.friends,t:Date.now()}).catch(()=>{})},800)}
(async()=>{try{if(!window.claude)return;const u=await claude.use("user"),d=await claude.use("db");if(!u||!d)return;me=await u.id();if(!me)return;db=d;
db.collection("players").onSnapshot(s=>{players={};s.docs.forEach(x=>players[x.id]=x.data());if(tab==="soc"&&!/INPUT/.test(document.activeElement.tagName))R()},()=>{});
db.collection("clubs").onSnapshot(s=>{clubs={};s.docs.forEach(x=>clubs[x.id]=x.data());},()=>{});
db.collection("ev/"+me+"/items").onSnapshot(s=>{s.docChanges().forEach(ch=>{if(ch.type!=="added")return;const e=ch.doc.data();
if(e.type==="sale"){S.coins+=+e.amount||0;addLog(esc(e.from)+" t’a acheté "+esc(e.card||"une carte")+" : +"+(+e.amount||0));toast(e.from+" t’a acheté une carte : +"+(+e.amount||0))}else if(e.type==="card"){S.owned[e.cid]=(S.owned[e.cid]||0)+1;addLog(esc(e.from)+" t’a offert une carte");toast(e.from+" t’a offert une carte")}
else if(e.type==="gift"){S.en.n=Math.min(MAXE,en()+(+e.amount||1));addLog(esc(e.from)+" t’a offert de l’énergie");toast(e.from+" t’a offert de l’énergie")}
db.doc("ev/"+me+"/items/"+ch.doc.id).delete().catch(()=>{});save();if(!spinning&&!$("#modal").innerHTML)R()})},()=>{});
pushProfile();R();if(window.initDb2)initDb2()}catch(e){db=null}})();

function shrink(file){return new Promise((res,rej)=>{const im=new Image(),u=URL.createObjectURL(file);im.onload=()=>{const k=Math.min(1,360/Math.max(im.width,im.height)),cv=document.createElement("canvas");cv.width=Math.round(im.width*k);cv.height=Math.round(im.height*k);cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);URL.revokeObjectURL(u);res(cv.toDataURL("image/webp",.85))};im.onerror=rej;im.src=u})}
function cardHTML(c,show,n){const r=rar(c.rid);return `<div class="card ${show?"":"lock"}" style="--rc:${r.color}">${n>1?`<em>×${n}</em>`:""}<div class="pic">${show?`<img src="${c.img}" alt="${esc(c.name)}">`:"<span>?</span>"}</div><b>${show?esc(c.name):"???"}</b><i>${esc(r.name)} · ${r.pts} pt${r.pts>1?"s":""}</i></div>`}

/* machine */
const SYM=["coin","chip","bag","chili","bolt"],W=[28,28,14,15,15];
const pick=()=>{let x=Math.random()*100;for(let i=0;i<5;i++){if((x-=W[i])<0)return SYM[i]}return"chip"};
function vPlay(){const e=en(),ready=Date.now()-S.set.last>=864e5;
return `<div class="mach"><h2>Machine à chips</h2>
<div class="en"><span style="display:flex;gap:6px;align-items:center">${ic("bolt",22)}<b>${e} / ${MAXE}</b></span><span id="entxt">${enTxt()}</span></div>
<div class="reels">${[0,1,2].map(i=>`<div class="reel" id="r${i}">${ic(SYM[(i*2)%5],64)}</div>`).join("")}</div>
<p class="msg" id="msg">${esc(lastMsg)}</p>
<button class="big" data-act="spin" ${e<1||spinning?"disabled":""}>Lancer · 1 ${ic("bolt",20)}</button></div>
<div class="row l"><button class="btn" data-act="daily" ${ready?"":"disabled"}>${ic("coin",20)} Bonus du jour +${S.set.daily}</button></div>
<h3>Combinaisons</h3><ul class="odds"><li><span>3 ${ic("coin",18)}</span><span>300 chips coins</span></li><li><span>3 ${ic("chip",18)}</span><span>100 chips coins</span></li><li><span>3 ${ic("bag",18)}</span><span>Un paquet gratuit</span></li><li><span>3 ${ic("chili",18)}</span><span>200 chips coins</span></li><li><span>3 ${ic("bolt",18)}</span><span>+5 énergie</span></li></ul>
<h3>Activité</h3>${S.log.length?`<ul class="log">${S.log.map(l=>`<li>${l}</li>`).join("")}</ul>`:`<p class="sub">Rien pour l’instant. Va jouer une main à une table ou ajoute des amis.</p>`}`}
function gain(n,t){if(S.club)n=Math.round(n*1.1);S.coins+=n;lastMsg=t.replace("{n}",n)}
function spin(){if(spinning||en()<1)return;spinning=true;if(S.en.n>=MAXE)S.en.t=Date.now();S.en.n--;save();
$("#msg").textContent="…";document.querySelector('[data-act="spin"]').disabled=true;
const res=[pick(),pick(),pick()],rs=[0,1,2].map(i=>$("#r"+i));rs.forEach(r=>r.classList.add("go"));
const iv=setInterval(()=>rs.forEach(r=>{if(r.classList.contains("go"))r.innerHTML=ic(SYM[Math.floor(Math.random()*5)],64)}),90);
rs.forEach((r,i)=>setTimeout(()=>{r.classList.remove("go");r.innerHTML=ic(res[i],64);if(i===2){clearInterval(iv);setTimeout(()=>payout(res),350)}},700+i*450))}
function payout(r){const c={};r.forEach(s=>c[s]=(c[s]||0)+1);const top=Object.keys(c).sort((a,b)=>c[b]-c[a])[0],n=c[top];let after=null;
if(n===3){if(top==="coin")gain(300,"Jackpot ! +{n} chips coins");else if(top==="chip")gain(100,"Trois chips : +{n} chips coins");else if(top==="bag"){lastMsg="Paquet gratuit !";after=()=>openPack(true)}else if(top==="bolt"){S.en.n=Math.min(MAXE,en()+5);lastMsg="+5 énergie !"}else gain(200,"Piment : +{n} chips coins")}
else if(c.coin===2)gain(40,"Deux pièces : +{n} chips coins");else if(n===2)gain(15,"Une paire : +{n} chips coins");else gain(5,"Quelques miettes : +{n} chips coins");
spinning=false;save();R();if(after)setTimeout(after,500)}

/* raid */
function targets(){const ids=new Set(S.friends);Object.keys(players).forEach(i=>{if(S.club&&players[i].club===S.club)ids.add(i)});return[...ids].filter(i=>i!==me&&players[i]&&players[i].coins>0)}
function raidPick(){const t=db?targets():[];
$("#modal").innerHTML=`<div class="modal"><div><h2>Qui piller ?</h2><p class="sub">Tu prends jusqu’à 25 % de ses chips coins (400 max).</p>
${t.map(i=>`<div class="pl"><span>${esc(players[i].nick)} · ${players[i].coins} ${ic("coin",16)}</span><button class="btn sm" data-act="raid" data-id="${i}">Piller</button></div>`).join("")}
<div class="pl"><span>Papy Chips (bot) · toujours là</span><button class="btn sm alt" data-act="raid" data-id="bot">Piller</button></div>
${db?"":`<p class="sub">Partage la page pour piller de vrais joueurs.</p>`}</div></div>`}
function doRaid(id){let amt;if(id==="bot"){amt=120+Math.floor(Math.random()*100);addLog("Tu as pillé Papy Chips : +"+amt)}
else{const p=players[id];amt=Math.min(p.coins,400,Math.max(10,Math.floor(p.coins*.25)));p.coins-=amt;addLog("Tu as pillé "+esc(p.nick)+" : +"+amt);db.doc("ev/"+id+"/items/"+uid()).set({type:"raid",from:S.nick,amount:amt,t:Date.now()}).catch(()=>{})}
S.coins+=amt;lastMsg="Pillage réussi : +"+amt+" chips coins";save();$("#modal").innerHTML="";R()}
function gift(id){const d=S.gifted[id]||0;if(Date.now()-d<864e5)return toast("Cadeau déjà envoyé aujourd’hui");S.gifted[id]=Date.now();db.doc("ev/"+id+"/items/"+uid()).set({type:"gift",from:S.nick,amount:1,t:Date.now()}).catch(()=>{});toast("Énergie envoyée");save();R()}

/* tables de jeu */
const NAMES=["Mika","Lola92","Tonton_Chips","Sacha","Nina","PaprikaKid","Zoé","Max_Crunch","Léo","Camille","Bibi","Anouk","Jul","Mélo","Rémi_75","Chloé","Dylan","Yanis","Roxane","Gaby"];
const TN=["Apéro du comptoir","Chips et paprika","Table des croquants","Happy hour","Sel marin","Barbecue du dimanche","Oignon rouge","Crème et ciboulette"],STK=[10,20,50,100,250];
let curT=null;
function rng(s){return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function tables(){const b=Math.floor(Date.now()/24e4),r=rng(b*7919+13),out=[];
for(let i=0;i<6;i++){const mise=STK[Math.floor(r()*5)],seats=3+Math.floor(r()*3),occ=1+Math.floor(r()*(seats-1)),pool=NAMES.slice(),seated=[];
for(let k=0;k<occ;k++)seated.push(pool.splice(Math.floor(r()*pool.length),1)[0]);
out.push({id:b+"-"+i,name:TN[(i+b)%TN.length],mise,seats,seated,tag:mise<=20?"Apéro":mise<=50?"Soirée":"Grande tablée"})}
return out.sort((a,b)=>a.mise-b.mise)}
function vTbl(){const none=!Object.keys(S.owned).length;
return `<h2>Tables</h2><p class="sub">Chacun pose une carte : la plus forte en points ramasse la mise de la table. Des joueurs et des bots sont assis, à toi de deviner qui est qui.</p>
${none?`<div class="empty" style="margin-bottom:12px">Tu n’as aucune carte. Ouvre un paquet dans la boutique pour t’asseoir.</div>`:""}
<p class="sub">Mains gagnées : <b>${S.stats.wins}</b> sur ${S.stats.hands}</p>
${tables().map(t=>`<div class="tb"><div><b>${esc(t.name)}</b><div class="sub" style="margin:0">${t.tag} · ${t.seated.length}/${t.seats} joueurs</div><div class="seats">${t.seated.map(n=>`<span>${esc(n)}</span>`).join("")}${Array(t.seats-t.seated.length).fill('<span class="e">libre</span>').join("")}</div></div><button class="btn" data-act="join" data-id="${t.id}" ${S.coins>=t.mise&&!none?"":"disabled"}>${t.mise} ${ic("coin",18)}</button></div>`).join("")}`}
function picker(t){const mine=S.cards.filter(c=>S.owned[c.id]).sort((a,b)=>rar(b.rid).pts-rar(a.rid).pts);
$("#modal").innerHTML=`<div class="modal"><div><h2>${esc(t.name)}</h2><p class="sub">Mise : ${t.mise} chips coins. Choisis la carte que tu poses.</p><div class="grid">${mine.map(c=>`<button class="cb" data-act="play" data-id="${c.id}">${cardHTML(c,true,S.owned[c.id])}</button>`).join("")}</div><div class="row"><button class="btn alt" data-act="close">Annuler</button></div></div></div>`}
function playHand(cid){const t=curT,c=S.cards.find(x=>x.id===cid);if(!t||!c||S.coins<t.mise)return;S.coins-=t.mise;
const {act,tw}=odds(),pool=NAMES.filter(n=>!t.seated.includes(n)),opp=t.seated.slice(0,t.seats-1);
while(opp.length<t.seats-1)opp.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
const d=()=>{let x=Math.random()*tw,r=act[act.length-1];for(const a of act){if((x-=a.weight)<0){r=a;break}}const p=S.cards.filter(k=>k.rid===r.id);return p[Math.floor(Math.random()*p.length)]};
const E=[{n:"Toi",c,me:true}];opp.forEach(n=>{let a=d();for(let q=0;q<2;q++){const b2=d();if(rar(b2.rid).pts>rar(a.rid).pts)a=b2}E.push({n,c:a})});
const best=Math.max(...E.map(e=>rar(e.c.rid).pts)),Wn=E.filter(e=>rar(e.c.rid).pts===best),pot=Math.floor(t.mise*t.seats*.9),share=Math.floor(pot/Wn.length),won=Wn.some(e=>e.me);
S.stats.hands++;if(won){S.stats.wins++;S.coins+=share}
addLog(won?"Main gagnée à "+esc(t.name)+" : +"+share:"Main perdue à "+esc(t.name)+" : −"+t.mise);save();
const res=won?(Wn.length>1?"Égalité ! Tu partages le pot : +"+share+" chips coins":"Tu ramasses la mise : +"+share+" chips coins"):Wn.map(e=>e.n).join(" et ")+" ramasse"+(Wn.length>1?"nt":"")+" le pot de "+pot+" chips coins";
$("#modal").innerHTML=`<div class="modal"><div><h2>${esc(t.name)}</h2><p class="sub">Pot : ${pot} chips coins · ${t.seats} joueurs</p><div class="grid">${E.map((e,i)=>`<div><div class="flip" id="f${i}"><div class="in"><div class="back">${ic("chip",44)}</div><div class="front">${cardHTML(e.c,true,0)}</div></div></div><p class="who">${esc(e.n)}</p></div>`).join("")}</div><p class="msg" id="res"></p><div class="row" id="rb"></div></div></div>`;
E.forEach((e,i)=>setTimeout(()=>{const f=$("#f"+i);f&&f.classList.add("on")},400+i*650));
setTimeout(()=>{if(!$("#res"))return;E.forEach((e,i)=>{if(Wn.includes(e)){const f=$("#f"+i);f&&f.classList.add("win")}});$("#res").textContent=res;$("#rb").innerHTML='<button class="btn" data-act="again">Rejouer ici</button><button class="btn alt" data-act="close">Retour aux tables</button>';R()},400+E.length*650+500)}

/* cartes, boutique */
function vCol(){const cs=S.cards,got=nCards(),list=cs.filter(c=>filt==="all"||c.rid===filt);
return `<h2>Ma collection</h2><div class="bar"><div style="width:${cs.length?got/cs.length*100:0}%"></div></div><p class="sub">${got} / ${cs.length} cartes débloquées</p>
<div class="chips"><button data-act="f" data-v="all" class="${filt==="all"?"on":""}">Toutes</button>${S.rarities.map(r=>`<button data-act="f" data-v="${r.id}" class="${filt===r.id?"on":""}" style="--rc:${r.color}">${esc(r.name)}</button>`).join("")}</div>
${cs.length?`<div class="grid">${list.map(c=>cardHTML(c,!!S.owned[c.id],S.owned[c.id])).join("")}</div>`:`<div class="empty">Aucune carte pour l’instant. Reviens bientôt !</div>`}`}
function odds(){const act=S.rarities.filter(r=>r.weight>0&&S.cards.some(c=>c.rid===r.id));return{act,tw:act.reduce((a,r)=>a+r.weight,0)||1}}
function vShop(){const {act,tw}=odds(),can=S.cards.length>0&&act.length>0;
return `<h2>Boutique</h2><div class="pack"><div class="bag">PATATOGO</div><p class="sub">Un paquet contient ${S.set.size} carte${S.set.size>1?"s":""} au hasard.</p>
<button class="big" data-act="buy" ${can&&S.coins>=S.set.price?"":"disabled"}>Ouvrir · ${S.set.price} ${ic("coin",22)}</button>
${!can?`<p class="sub">Les cartes arrivent bientôt.</p>`:""}
<ul class="odds">${act.map(r=>`<li style="--rc:${r.color}"><b>${esc(r.name)}</b><span>${(r.weight/tw*100).toFixed(1)} %</span></li>`).join("")}</ul></div>
<p class="sub">Il te manque des chips coins ? Tourne la machine, pille tes amis et récupère le bonus du jour.</p>`}
function openPack(free){const {act,tw}=odds();if(!act.length)return toast("Aucune carte dans le jeu pour l’instant");if(!free){if(S.coins<S.set.price)return;S.coins-=S.set.price}
const pulls=[];for(let i=0;i<S.set.size;i++){let x=Math.random()*tw,r=act[act.length-1];for(const a of act){if((x-=a.weight)<0){r=a;break}}const pool=S.cards.filter(c=>c.rid===r.id),c=pool[Math.floor(Math.random()*pool.length)];pulls.push({c,isNew:!S.owned[c.id]});S.owned[c.id]=(S.owned[c.id]||0)+1}
save();R();
$("#modal").innerHTML=`<div class="modal"><div><h2>Ton paquet</h2><p class="sub">Touche une carte pour la retourner.</p><div class="grid">${pulls.map(p=>`<div class="flip" data-act="flip">${p.isNew?'<span class="new">Nouvelle !</span>':""}<div class="in"><div class="back">${ic("chip",44)}</div><div class="front">${cardHTML(p.c,true,0)}</div></div></div>`).join("")}</div>
<div class="row"><button class="btn alt" data-act="all">Tout retourner</button><button class="btn" data-act="close">Fermer</button></div></div></div>`}

/* social */
const clubName=c=>(clubs[c]&&clubs[c].name)||c;
function vSoc(){const tabs=`<div class="tabs">${[["friends","Amis"],["club","Club"],["top","Classement"]].map(([k,l])=>`<button data-act="ss" data-v="${k}" class="${ss===k?"on":""}">${l}</button>`).join("")}</div>`;
if(!db)return `<h2>Social</h2><div class="panel"><p style="margin:0 0 8px"><b>Mode solo.</b> Les amis, les clubs et le classement demandent d’être connecté et d’avoir accès en tant que contributeur à la page.</p><p class="sub" style="margin:0">En attendant, la machine, les paquets et les tables de jeu fonctionnent normalement.</p></div>`;
const pseudo=`<div class="panel"><label for="nk">Ton pseudo</label><div style="display:flex;gap:8px"><input id="nk" maxlength="16" value="${esc(S.nick)}"><button class="btn" data-act="nick">OK</button></div></div>`;
if(ss==="friends"){return `<h2>Social</h2>${tabs}${pseudo}
<div class="panel"><label>Ton code ami</label><div style="display:flex;gap:8px"><input readonly value="${esc(me)}" id="mc" aria-label="Ton code ami"><button class="btn" data-act="copy">Copier</button></div>
<label for="fc" style="margin-top:12px">Ajouter un ami</label><div style="display:flex;gap:8px"><input id="fc" placeholder="Colle son code"><button class="btn" data-act="addf">Ajouter</button></div></div>
<h3>Mes amis</h3>${S.friends.length?S.friends.map(i=>{const p=players[i];return `<div class="pl"><span>${p?esc(p.nick)+" · "+p.cards+" cartes":"Ami (hors ligne)"}</span><span><button class="btn sm alt" data-act="gift" data-id="${i}" ${p?"":"disabled"}>${ic("gift",16)} Énergie</button> <button class="btn sm del" data-act="delf" data-id="${i}">Retirer</button></span></div>`}).join(""):`<div class="empty">Aucun ami. Envoie ton code à un ami et ajoute le sien.</div>`}`}
if(ss==="club"){if(!S.club)return `<h2>Social</h2>${tabs}<div class="panel"><p class="sub" style="margin-top:0">Rejoins un club pour gagner 10 % de chips coins en plus partout, et pour grimper au classement des clubs.</p>
<label for="cc">Créer un club</label><div style="display:flex;gap:8px"><input id="cc" maxlength="20" placeholder="Nom du club"><button class="btn" data-act="mkclub">Créer</button></div>
<label for="jc" style="margin-top:12px">Rejoindre avec un code</label><div style="display:flex;gap:8px"><input id="jc" maxlength="6" placeholder="Code à 6 caractères"><button class="btn" data-act="joinclub">Rejoindre</button></div></div>`;
const mem=Object.keys(players).filter(i=>players[i].club===S.club).sort((a,b)=>players[b].cards-players[a].cards),tot=mem.reduce((a,i)=>a+players[i].cards,0);
return `<h2>${esc(clubName(S.club))}</h2>${tabs}<div class="panel"><div class="pl" style="border:0"><span>Code du club : <b>${esc(S.club)}</b></span><span class="sub" style="margin:0">${mem.length} membre${mem.length>1?"s":""} · ${tot} cartes</span></div><p class="sub" style="margin:0">Bonus actif : +10 % de chips coins gagnés.</p></div>
${mem.map((i,k)=>`<div class="pl"><span><span class="rk">${k+1}</span>${esc(players[i].nick)}${i===me?" (toi)":""}</span><span>${players[i].cards} cartes</span></div>`).join("")}
<div class="row l"><button class="btn alt" data-act="leave">Quitter le club</button></div>`}
const top=Object.keys(players).sort((a,b)=>players[b].cards-players[a].cards).slice(0,10);const cl={};Object.values(players).forEach(p=>{if(p.club)cl[p.club]=(cl[p.club]||0)+p.cards});const tc=Object.keys(cl).sort((a,b)=>cl[b]-cl[a]).slice(0,5);
return `<h2>Classement</h2>${tabs}<h3>Collectionneurs</h3>${top.map((i,k)=>`<div class="pl ${i===me?"me":""}"><span><span class="rk">${k+1}</span>${esc(players[i].nick)}</span><span>${players[i].cards} cartes</span></div>`).join("")||`<p class="sub">Personne pour l’instant.</p>`}
<h3>Clubs</h3>${tc.map((c,k)=>`<div class="pl ${c===S.club?"me":""}"><span><span class="rk">${k+1}</span>${esc(clubName(c))}</span><span>${cl[c]} cartes</span></div>`).join("")||`<p class="sub">Aucun club pour l’instant.</p>`}`}

/* admin */
function vAdm(){
if(!unlocked)return `<h2>Admin</h2><div class="panel"><label for="pin">Code admin</label><input id="pin" type="password" inputmode="numeric" autocomplete="off"><div class="row l"><button class="btn" data-act="unlock">Entrer</button></div><p class="sub">Code par défaut : 0000.</p></div>`;
const tabs=`<div class="tabs">${[["cards","Cartes"],["rar","Raretés"],["set","Réglages"]].map(([k,l])=>`<button data-act="sub" data-v="${k}" class="${sub===k?"on":""}">${l}</button>`).join("")}</div>`;
if(sub==="cards")return `<h2>Admin</h2>${tabs}<div class="panel"><h3 style="margin-top:0">Nouvelle carte</h3>
<label for="cn">Nom de la chips</label><input id="cn" placeholder="Ex. Paprika Max"><label for="cr">Rareté</label><select id="cr">${S.rarities.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join("")}</select>
<label for="cf">Image</label><input id="cf" type="file" accept="image/*">${pend?`<img class="pv" src="${pend}" alt="Aperçu">`:""}
<div class="row l"><button class="btn" data-act="addcard">Ajouter la carte</button></div></div>
<div class="panel"><h3 style="margin-top:0">${S.cards.length} carte${S.cards.length>1?"s":""}</h3>${S.cards.length?S.cards.map(c=>`<div class="li"><img src="${c.img}" alt=""><span>${esc(c.name)}</span><select data-ch="cardr" data-id="${c.id}">${S.rarities.map(r=>`<option value="${r.id}" ${r.id===c.rid?"selected":""}>${esc(r.name)}</option>`).join("")}</select><button class="btn del sm" data-act="delcard" data-id="${c.id}">Suppr.</button></div>`).join(""):`<p class="sub">Aucune carte.</p>`}</div>`;
if(sub==="rar"){const tw=S.rarities.reduce((a,r)=>a+r.weight,0)||1;return `<h2>Admin</h2>${tabs}<div class="panel"><p class="sub">Poids = fréquence dans les paquets (plus il est grand, plus ça sort). Points (dernière colonne) = force de la carte aux tables de jeu.</p>
${S.rarities.map(r=>`<div class="rr"><input data-ch="rn" data-id="${r.id}" value="${esc(r.name)}" aria-label="Nom"><input type="color" data-ch="rc" data-id="${r.id}" value="${r.color}" aria-label="Couleur"><input type="number" min="0" step="0.5" data-ch="rw" data-id="${r.id}" value="${r.weight}" aria-label="Poids"><input type="number" min="1" data-ch="rp" data-id="${r.id}" value="${r.pts}" aria-label="Points"><button class="btn del sm" data-act="delrar" data-id="${r.id}">Suppr.</button></div><p class="sub" style="margin:-4px 0 8px">${(r.weight/tw*100).toFixed(1)} % des tirages</p>`).join("")}<button class="btn" data-act="addrar">Ajouter une rareté</button></div>`}
return `<h2>Admin</h2>${tabs}<div class="panel"><label for="sp">Prix d’un paquet (chips coins)</label><input id="sp" type="number" min="0" data-ch="set" data-k="price" value="${S.set.price}">
<label for="ss2">Cartes par paquet</label><input id="ss2" type="number" min="1" max="10" data-ch="set" data-k="size" value="${S.set.size}">
<label for="sd">Bonus du jour</label><input id="sd" type="number" min="0" data-ch="set" data-k="daily" value="${S.set.daily}">

<div class="row l"><button class="btn alt" data-act="give">+500 chips coins</button></div></div>
<div class="panel"><h3 style="margin-top:0">Sauvegarde</h3><p class="sub">Les cartes et la progression sont stockées sur cet appareil.</p><textarea id="bk" rows="4" placeholder="Colle ici une sauvegarde à importer"></textarea>
<div class="row l"><button class="btn" data-act="export">Générer</button><button class="btn alt" data-act="import">Importer</button><button class="btn del" data-act="reset">Tout effacer</button></div></div>`}

function R(){$("#coins").innerHTML=ic("coin",24)+"<span>"+S.coins+"</span>";document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===tab));
$("#app").innerHTML=({play:vPlay,tbl:vTbl,col:vCol,shop:vShop,soc:vSoc,adm:vAdm}[tab])()}

document.addEventListener("click",async e=>{const t=e.target.closest("[data-act]");if(!t)return;const a=t.dataset.act,v=t.dataset.v,id=t.dataset.id;
if(a==="tab"){if(spinning)return;tab=v;R()}else if(a==="f"){filt=v;R()}else if(a==="sub"){sub=v;R()}else if(a==="ss"){ss=v;R()}
else if(a==="spin")spin();else if(a==="buy")openPack(false);
else if(a==="flip")t.classList.toggle("on");else if(a==="all")document.querySelectorAll(".flip").forEach(f=>f.classList.add("on"));
else if(a==="close"){$("#modal").innerHTML="";R()}
else if(a==="join"){const tb=tables().find(x=>x.id===id);if(!tb)return toast("Cette table vient de fermer");if(!Object.keys(S.owned).length)return toast("Ouvre un paquet pour avoir des cartes");if(S.coins<tb.mise)return toast("Pas assez de chips coins");curT=tb;picker(tb)}
else if(a==="play")playHand(id);
else if(a==="again"){if(S.coins<curT.mise)return toast("Pas assez de chips coins");picker(curT)}
else if(a==="daily"){if(Date.now()-S.set.last>=864e5){S.coins+=+S.set.daily;S.set.last=Date.now();save();R();toast("+"+S.set.daily+" chips coins")}}
else if(a==="nick"){const n=$("#nk").value.trim();if(n){S.nick=n;save();toast("Pseudo enregistré")}}
else if(a==="copy"){try{await navigator.clipboard.writeText(me);toast("Code copié")}catch(x){$("#mc").select();toast("Copie le code affiché")}}
else if(a==="addf"){const c=$("#fc").value.trim();if(!c||c===me)return toast("Code invalide");if(!players[c])return toast("Aucun joueur avec ce code");if(!S.friends.includes(c)){S.friends.push(c);save()}R()}
else if(a==="delf"){S.friends=S.friends.filter(x=>x!==id);save();R()}
else if(a==="gift")gift(id);
else if(a==="mkclub"){const n=$("#cc").value.trim();if(!n)return toast("Donne un nom au club");const code=uid().slice(0,6).toUpperCase();try{await db.doc("clubs/"+code).set({name:n,owner:me});S.club=code;clubs[code]={name:n};save();R()}catch(x){toast("Création impossible pour l’instant")}}
else if(a==="joinclub"){const c=$("#jc").value.trim().toUpperCase();if(!c)return;try{const d=await db.doc("clubs/"+c).get();if(!d.exists)return toast("Club introuvable");clubs[c]=d.data();S.club=c;save();R()}catch(x){toast("Impossible de rejoindre")}}
else if(a==="leave"){S.club="";save();R()}
else if(a==="unlock"){if($("#pin").value===String(S.set.pin)){unlocked=true;R()}else toast("Code incorrect")}else if(a==="lock"){unlocked=false;R()}
else if(a==="addcard"){const n=$("#cn").value.trim();if(!n)return toast("Donne un nom à la carte");if(!pend)return toast("Choisis une image");S.cards.push({id:uid(),name:n,rid:$("#cr").value,img:pend});pend=null;save();R();toast("Carte ajoutée")}
else if(a==="delcard"){if(confirm("Supprimer cette carte ?")){S.cards=S.cards.filter(c=>c.id!==id);delete S.owned[id];save();R()}}
else if(a==="addrar"){S.rarities.push({id:uid(),name:"Nouvelle rareté",color:"#2CA58D",weight:5,pts:3});save();R()}
else if(a==="delrar"){if(S.cards.some(c=>c.rid===id))return toast("Des cartes utilisent cette rareté");if(S.rarities.length<2)return;S.rarities=S.rarities.filter(r=>r.id!==id);save();R()}
else if(a==="give"){S.coins+=500;save();R();toast("+500 chips coins")}
else if(a==="export"){const j=JSON.stringify(S);$("#bk").value=j;try{await navigator.clipboard.writeText(j);toast("Sauvegarde copiée")}catch(x){$("#bk").select();toast("Copie le texte affiché")}}
else if(a==="import"){try{const d=JSON.parse($("#bk").value);if(!d.cards||!d.rarities||!d.set)throw 0;S=Object.assign(DEF(),d);save();R();toast("Sauvegarde importée")}catch(x){toast("Sauvegarde invalide")}}
else if(a==="reset"){if(confirm("Tout effacer (cartes, collection, coins) ?")){S=DEF();save();pend=null;R()}}});
document.addEventListener("change",async e=>{const t=e.target;
if(t.id==="cf"&&t.files[0]){try{pend=await shrink(t.files[0]);const n=$("#cn").value,r=$("#cr").value;R();$("#cn").value=n;$("#cr").value=r}catch(x){toast("Image illisible")}return}
const c=t.dataset.ch;if(!c)return;const id=t.dataset.id;
if(c==="cardr")S.cards.find(x=>x.id===id).rid=t.value;else if(c==="rn")rar(id).name=t.value.trim()||"Sans nom";else if(c==="rc")rar(id).color=t.value;else if(c==="rp")rar(id).pts=Math.max(1,Math.round(+t.value||1));
else if(c==="rw"){rar(id).weight=Math.max(0,+t.value||0);save();R();return}
else if(c==="set"){const k=t.dataset.k;S.set[k]=k==="pin"?(t.value||"0000"):Math.max(k==="size"?1:0,Math.min(k==="size"?10:1e6,+t.value||0))}save()});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="pin")document.querySelector('[data-act="unlock"]').click()});
R();


/* v3 : paquets, vente, repos des cartes, marché de club, catalogue partagé */
let mUn=null,market=[],sig={},ct=0,selCard=null;
function fix(){S.set.unl=S.set.unl==null?10:S.set.unl;S.set.cool=S.set.cool==null?10:S.set.cool;S.used=S.used||{};S.shop=S.shop||[];
if(!S.packs||!S.packs.length)S.packs=[{id:"p1",name:"Paquet classique",price:S.set.price,size:S.set.size}];
S.packs.forEach(p=>{if(!p.w)p.w=Object.fromEntries(S.rarities.map(r=>[r.id,r.weight]))})}
function R2(){if(!$("#modal").innerHTML&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))R()}
const lockLeft=c=>{const u=S.used&&S.used[c.id];return u?Math.max(0,S.set.cool*6e4-(Date.now()-u)):0};
const unlPrice=c=>Math.max(1,Math.round(rar(c.rid).pts*S.set.unl));
const pk=id=>S.packs.find(p=>p.id===id);
function packOdds(p){const list=S.rarities.map(r=>({r,w:(p.w&&p.w[r.id]!=null)?p.w[r.id]:r.weight})).filter(x=>x.w>0&&S.cards.some(c=>c.rid===x.r.id));return{list,tw:list.reduce((a,x)=>a+x.w,0)||1}}

/* catalogue partagé */
function pushCat(){if(!db||!unlocked)return;clearTimeout(ct);ct=setTimeout(async()=>{try{
await db.doc("cfg/main").set({rarities:S.rarities,packs:S.packs,shop:S.shop,set:{daily:S.set.daily,unl:S.set.unl,cool:S.set.cool,price:S.set.price,size:S.set.size}});
for(const c of S.cards){const g=c.name+c.rid+c.img.length;if(sig[c.id]!==g){await db.doc("cards/"+c.id).set(c);sig[c.id]=g}}
for(const id of Object.keys(sig)){if(!S.cards.some(c=>c.id===id)){await db.doc("cards/"+id).delete();delete sig[id]}}
}catch(e){toast("Publication impossible : il faut les droits d’éditeur")}},1200)}
save=function(){try{localStorage.setItem(K,JSON.stringify(S))}catch(e){toast("Stockage plein : supprime des cartes ou fais une sauvegarde.")}pushProfile();pushCat();pushSave()};
function subMarket(){if(mUn){mUn();mUn=null}market=[];if(!db||!S.club)return;try{mUn=db.collection("clubs/"+S.club+"/market").onSnapshot(s=>{market=s.docs.map(d=>({id:d.id,...d.data()}));if(tab==="soc"&&ss==="mkt")R2()},()=>{})}catch(e){}}
window.initDb2=function(){
db.doc("cfg/main").onSnapshot(d=>{if(unlocked||!d.exists)return;const v=d.data();if(v.rarities)S.rarities=JSON.parse(JSON.stringify(v.rarities));if(v.packs)S.packs=JSON.parse(JSON.stringify(v.packs));S.shop=JSON.parse(JSON.stringify(v.shop||[]));Object.assign(S.set,v.set||{});save();R2()},()=>{});
db.collection("cards").onSnapshot(s=>{s.docs.forEach(d=>{const x=d.data();sig[d.id]=x.name+x.rid+(x.img||"").length});if(unlocked||s.empty)return;S.cards=s.docs.map(d=>({...d.data()}));save();R2()},()=>{});
subMarket()};

/* boutique */
vShop=function(){const offers=S.shop.map(o=>({o,c:S.cards.find(x=>x.id===o.cid)})).filter(x=>x.c);
return `<h2>Boutique</h2><h3>Paquets</h3>${S.packs.map(p=>{const q=packOdds(p),ok=q.list.length>0;return `<div class="pack" style="text-align:left;margin-bottom:12px"><div class="pl" style="border:0"><b style="font:400 20px 'Bagel Fat One',sans-serif">${esc(p.name)}</b><span class="sub" style="margin:0">${p.size} carte${p.size>1?"s":""}</span></div><ul class="odds">${q.list.map(x=>`<li style="--rc:${x.r.color}"><b>${esc(x.r.name)}</b><span>${(x.w/q.tw*100).toFixed(1)} %</span></li>`).join("")||"<li>Aucune carte disponible</li>"}</ul><div class="row l"><button class="btn" data-act="buypack" data-id="${p.id}" ${ok&&S.coins>=p.price?"":"disabled"}>Ouvrir · ${p.price} ${ic("coin",18)}</button></div></div>`}).join("")}
${offers.length?`<h3>Cartes à l’unité</h3><div class="grid">${offers.map(({o,c})=>`<div class="cl">${cardHTML(c,true,S.owned[c.id]||0)}<button class="btn sm" data-act="buycard" data-id="${o.id}" ${S.coins>=o.price?"":"disabled"}>${o.price} ${ic("coin",16)}</button></div>`).join("")}</div>`:""}
<p class="sub" style="margin-top:14px">Il te manque des chips coins ? Tourne la machine, joue aux tables ou récupère le bonus du jour.</p>`};
openPack=function(a,b){let p,free;if(typeof a==="boolean"){p=S.packs[0];free=a}else{p=S.packs.find(x=>x.id===a);free=b}if(!p)return;
const od=packOdds(p);if(!od.list.length)return toast("Aucune carte disponible pour ce paquet");if(!free){if(S.coins<p.price)return;S.coins-=p.price}
const pulls=[];for(let i=0;i<p.size;i++){let x=Math.random()*od.tw,r=od.list[od.list.length-1].r;for(const y of od.list){if((x-=y.w)<0){r=y.r;break}}const pool=S.cards.filter(c=>c.rid===r.id),c=pool[Math.floor(Math.random()*pool.length)];pulls.push({c,isNew:!S.owned[c.id]});S.owned[c.id]=(S.owned[c.id]||0)+1}
save();R();
$("#modal").innerHTML=`<div class="modal"><div><h2>${esc(p.name)}</h2><p class="sub">Touche une carte pour la retourner.</p><div class="grid">${pulls.map(q=>`<div class="flip" data-act="flip">${q.isNew?'<span class="new">Nouvelle !</span>':""}<div class="in"><div class="back">${ic("chip",44)}</div><div class="front">${cardHTML(q.c,true,0)}</div></div></div>`).join("")}</div><div class="row"><button class="btn alt" data-act="all">Tout retourner</button><button class="btn" data-act="close">Fermer</button></div></div></div>`};

/* tables : repos des cartes */
picker=function(t){const mine=S.cards.filter(c=>S.owned[c.id]).sort((a,b)=>rar(b.rid).pts-rar(a.rid).pts);
$("#modal").innerHTML=`<div class="modal"><div><h2>${esc(t.name)}</h2><p class="sub">Mise : ${t.mise} chips coins. Une carte jouée se repose ${S.set.cool} min, sauf si tu paies pour la débloquer.</p><div class="grid">${mine.map(c=>{const l=lockLeft(c);return l?`<div class="cl"><div style="opacity:.45">${cardHTML(c,true,S.owned[c.id])}</div><p class="who" style="font-size:13px">Repos : ${Math.ceil(l/6e4)} min</p><button class="btn sm" data-act="unlcard" data-id="${c.id}" ${S.coins>=unlPrice(c)?"":"disabled"}>Débloquer · ${unlPrice(c)} ${ic("coin",16)}</button></div>`:`<button class="cb" data-act="play" data-id="${c.id}">${cardHTML(c,true,S.owned[c.id])}</button>`}).join("")}</div><div class="row"><button class="btn alt" data-act="close">Annuler</button></div></div></div>`};
const _ph=playHand;
playHand=function(cid){const c=S.cards.find(x=>x.id===cid);if(!curT||!c||S.coins<curT.mise)return;if(lockLeft(c))return toast("Cette carte se repose encore");S.used[cid]=Date.now();_ph(cid)};

/* marché de club */
function vMkt(tabs){if(!S.club)return `<h2>Marché</h2>${tabs}<div class="empty">Rejoins un club pour acheter, vendre ou offrir des cartes.</div>`;
const its=market.map(m=>({m,c:S.cards.find(x=>x.id===m.cid)})).filter(x=>x.c);
return `<h2>Marché du club</h2>${tabs}<div class="row l" style="margin:0 0 12px"><button class="btn" data-act="sellmenu">Vendre ou donner une carte</button></div>${its.length?`<div class="grid">${its.map(({m,c})=>`<div class="cl">${cardHTML(c,true,0)}<p class="who" style="font-weight:600;font-size:13px">${esc(m.nick||"Membre")}</p><button class="btn sm ${m.seller===me?"alt":""}" data-act="buyl" data-id="${m.id}" ${m.seller!==me&&S.coins<m.price?"disabled":""}>${m.seller===me?"Retirer":m.price+" "+ic("coin",16)}</button></div>`).join("")}</div>`:`<div class="empty">Aucune carte en vente dans le club.</div>`}`}
const oldSoc=vSoc;
vSoc=function(){let h=oldSoc();if(!db)return h;h=h.replace('<button data-act="ss" data-v="top"','<button data-act="ss" data-v="mkt" class="'+(ss==="mkt"?"on":"")+'">Marché</button><button data-act="ss" data-v="top"');
if(ss==="mkt")return vMkt(h.match(/<div class="tabs">[\s\S]*?<\/div>/)[0]);return h};

/* admin : paquets et vente */
function admPacks(tabs){return `<h2>Admin</h2>${tabs}<p class="sub">Un paquet peut mélanger plusieurs raretés. Le nombre à côté de chaque rareté règle sa chance (0 = absente du paquet).</p>${S.packs.map(p=>`<div class="panel"><label>Nom du paquet</label><input data-ch="pkn" data-id="${p.id}" value="${esc(p.name)}"><div style="display:flex;gap:8px"><div style="flex:1"><label>Prix</label><input type="number" min="0" data-ch="pkp" data-id="${p.id}" value="${p.price}"></div><div style="flex:1"><label>Cartes</label><input type="number" min="1" max="10" data-ch="pks" data-id="${p.id}" value="${p.size}"></div></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px">${S.rarities.map(r=>`<div><label style="color:${r.color}">${esc(r.name)}</label><input type="number" min="0" step="0.5" data-ch="pkw" data-id="${p.id}" data-r="${r.id}" value="${(p.w&&p.w[r.id]!=null)?p.w[r.id]:r.weight}"></div>`).join("")}</div><div class="row l"><button class="btn del sm" data-act="delpack" data-id="${p.id}">Supprimer</button></div></div>`).join("")}<button class="btn" data-act="addpack">Nouveau paquet</button>`}
function admShop(tabs){return `<h2>Admin</h2>${tabs}<div class="panel"><h3 style="margin-top:0">Vendre une carte à l’unité</h3><label for="oc">Carte</label><select id="oc">${S.cards.map(c=>`<option value="${c.id}">${esc(c.name)} (${esc(rar(c.rid).name)})</option>`).join("")}</select><label for="op">Prix (chips coins)</label><input id="op" type="number" min="0" value="100"><div class="row l"><button class="btn" data-act="addoffer" ${S.cards.length?"":"disabled"}>Mettre en vente</button></div></div>
<div class="panel"><h3 style="margin-top:0">En vente (${S.shop.length})</h3>${S.shop.map(o=>{const c=S.cards.find(x=>x.id===o.cid);return c?`<div class="li"><img src="${c.img}" alt=""><span>${esc(c.name)}</span><input type="number" min="0" data-ch="ofp" data-id="${o.id}" value="${o.price}" aria-label="Prix"><button class="btn del sm" data-act="deloffer" data-id="${o.id}">Retirer</button></div>`:""}).join("")||'<p class="sub">Aucune carte en vente.</p>'}</div>`}
const oldAdm=vAdm;
vAdm=function(){let h=oldAdm();if(!unlocked)return h;
h=h.replace('<button data-act="sub" data-v="rar"','<button data-act="sub" data-v="packs" class="'+(sub==="packs"?"on":"")+'">Paquets</button><button data-act="sub" data-v="shop" class="'+(sub==="shop"?"on":"")+'">Vente</button><button data-act="sub" data-v="rar"');
const tabs=h.match(/<div class="tabs">[\s\S]*?<\/div>/)[0];
if(sub==="packs")return admPacks(tabs);if(sub==="shop")return admShop(tabs);
return h.replace(/<label for="sp">[\s\S]*?<label for="sd">/,`<label for="su">Prix pour débloquer une carte (points × ce nombre)</label><input id="su" type="number" min="0" data-ch="set" data-k="unl" value="${S.set.unl}"><label for="sk">Repos d’une carte jouée (minutes)</label><input id="sk" type="number" min="0" data-ch="set" data-k="cool" value="${S.set.cool}"><label for="sd">`)};

R=function(){fix();$("#coins").innerHTML=ic("coin",24)+"<span>"+S.coins+"</span>";document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===tab));
$("#app").innerHTML=({play:vPlay,tbl:vTbl,col:vCol,shop:vShop,soc:vSoc,adm:vAdm}[tab])()};

/* actions v3 */
document.addEventListener("click",async e=>{const t=e.target.closest("[data-act]");if(!t)return;const a=t.dataset.act,id=t.dataset.id;
if(a==="unlock"&&unlocked)pushCat();
if(["mkclub","joinclub","leave"].includes(a))setTimeout(subMarket,700);
if(a==="buypack")openPack(id,false);
else if(a==="buycard"){const o=S.shop.find(x=>x.id===id);if(!o||S.coins<o.price)return;S.coins-=o.price;S.owned[o.cid]=(S.owned[o.cid]||0)+1;save();R();toast("Carte ajoutée à ta collection")}
else if(a==="unlcard"){const c=S.cards.find(x=>x.id===id);if(!c)return;const p=unlPrice(c);if(S.coins<p)return;S.coins-=p;delete S.used[id];save();R();picker(curT)}
else if(a==="addpack"){S.packs.push({id:uid(),name:"Nouveau paquet",price:50,size:3,w:Object.fromEntries(S.rarities.map(r=>[r.id,r.weight]))});save();R()}
else if(a==="delpack"){if(S.packs.length<2)return toast("Garde au moins un paquet");S.packs=S.packs.filter(p=>p.id!==id);save();R()}
else if(a==="addoffer"){const cid=$("#oc").value;if(!cid)return;S.shop.push({id:uid(),cid,price:Math.max(0,Math.round(+$("#op").value||0))});save();R();toast("Carte mise en vente")}
else if(a==="deloffer"){S.shop=S.shop.filter(o=>o.id!==id);save();R()}
else if(a==="sellmenu"){const mine=S.cards.filter(c=>S.owned[c.id]);$("#modal").innerHTML=`<div class="modal"><div><h2>Quelle carte ?</h2><div class="grid">${mine.map(c=>`<button class="cb" data-act="selc" data-id="${c.id}">${cardHTML(c,true,S.owned[c.id])}</button>`).join("")||'<p class="sub">Tu n’as aucune carte.</p>'}</div><div class="row"><button class="btn alt" data-act="close">Annuler</button></div></div></div>`}
else if(a==="selc"){const c=S.cards.find(x=>x.id===id);if(!c)return;selCard=id;const mates=Object.keys(players).filter(i=>i!==me&&players[i].club===S.club);
$("#modal").innerHTML=`<div class="modal"><div><h2>${esc(c.name)}</h2><div style="max-width:150px;margin:0 auto">${cardHTML(c,true,0)}</div><label for="sp2">Prix de vente (chips coins)</label><input id="sp2" type="number" min="0" value="${rar(c.rid).pts*20}"><div class="row l"><button class="btn" data-act="dolist">Mettre en vente</button></div><label for="mt">Ou donner à un membre</label><select id="mt">${mates.map(i=>`<option value="${i}">${esc(players[i].nick)}</option>`).join("")}</select><div class="row l"><button class="btn alt" data-act="donate" ${mates.length?"":"disabled"}>Donner</button></div><div class="row"><button class="btn alt" data-act="close">Fermer</button></div></div></div>`}
else if(a==="dolist"){if(!selCard||!S.owned[selCard]||!db||!S.club)return;const price=Math.max(0,Math.round(+$("#sp2").value||0));try{await db.doc("clubs/"+S.club+"/market/"+uid()).set({cid:selCard,price,seller:me,nick:S.nick,t:Date.now()});if(--S.owned[selCard]<=0)delete S.owned[selCard];save();$("#modal").innerHTML="";R();toast("Carte en vente dans le club")}catch(x){toast("Mise en vente impossible")}}
else if(a==="donate"){const to=$("#mt").value;if(!selCard||!S.owned[selCard]||!to||!db)return;try{await db.doc("ev/"+to+"/items/"+uid()).set({type:"card",cid:selCard,from:S.nick,t:Date.now()});if(--S.owned[selCard]<=0)delete S.owned[selCard];save();$("#modal").innerHTML="";R();toast("Carte offerte")}catch(x){toast("Don impossible")}}
else if(a==="buyl"){const m=market.find(x=>x.id===id);if(!m||!db)return;const path="clubs/"+S.club+"/market/"+id;
try{const d=await db.doc(path).get();if(!d.exists){toast("Cette carte n’est plus en vente");return}
if(m.seller===me){await db.doc(path).delete();S.owned[m.cid]=(S.owned[m.cid]||0)+1;save();R();toast("Carte retirée de la vente");return}
if(S.coins<m.price)return toast("Pas assez de chips coins");await db.doc(path).delete();S.coins-=m.price;S.owned[m.cid]=(S.owned[m.cid]||0)+1;
const c=S.cards.find(x=>x.id===m.cid);await db.doc("ev/"+m.seller+"/items/"+uid()).set({type:"sale",amount:m.price,from:S.nick,card:c?c.name:"",t:Date.now()}).catch(()=>{});save();R();toast("Carte achetée")}catch(x){toast("Achat impossible")}}});
document.addEventListener("change",e=>{const t=e.target,c=t.dataset.ch;if(!c)return;const id=t.dataset.id;
if(c==="pkn")pk(id).name=t.value.trim()||"Paquet";else if(c==="pkp")pk(id).price=Math.max(0,Math.round(+t.value||0));else if(c==="pks")pk(id).size=Math.max(1,Math.min(10,Math.round(+t.value||1)));
else if(c==="pkw"){const p=pk(id);p.w=p.w||{};p.w[t.dataset.r]=Math.max(0,+t.value||0)}
else if(c==="ofp"){const o=S.shop.find(x=>x.id===id);if(o)o.price=Math.max(0,Math.round(+t.value||0))}
else return;save()});
fix();R();

/* synchro du compte + mode admin */
let pst=0;
function pushSave(){if(window.MODE==="admin"||!window.SBDB)return;clearTimeout(pst);pst=setTimeout(()=>{SBDB.doc("saves/"+window.UID).set({coins:S.coins,owned:S.owned,nick:S.nick,friends:S.friends,club:S.club,gifted:S.gifted,log:S.log,en:S.en,stats:S.stats,used:S.used,set:{last:S.set.last}}).catch(()=>{})},1500)}
if(window.MODE==="admin"){unlocked=true;tab="adm";sub="cards";R()}
pushSave();
