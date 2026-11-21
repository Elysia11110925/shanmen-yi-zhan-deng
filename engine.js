'use strict';
const Game = (() => {
  const realms='引气 炼气 凝脉 筑基 灵台 金丹 元婴 化神 炼虚 返真 合体 大乘 渡仙 真仙 玄仙 金仙 太乙 大罗 道种 道君 道尊 合道 证道 道祖'.split(' ');
  const stages=['初期','中期','后期','圆满'], grades=['白 · 寻常','绿 · 精良','蓝 · 上品','紫 · 玄品','金 · 天品','红 · 绝品'];
  const jobs={train:'闭关吐纳',study:'研习功法',work:'坊间差事',herb:'照料灵田',heal:'静室疗伤',forge:'温养兵器',brew:'开炉炼丹'};
  const materials=[{id:'h',name:'青露草',kind:'药材',realm:0,q:0,desc:'青溪药圃的常备灵草。采药、炼丹与地方委托共用这份材料。'},{id:'ore',name:'星纹砂',kind:'器材',realm:0,q:1,desc:'地脉凝结的灵砂，可修洞府、探路与重铸。'}];
  const catalog=[...Catalog.arts,...Catalog.weapons,...Catalog.pills],map=new Map([...catalog,...materials].map(x=>[x.id,x]));
  const art=id=>Catalog.arts.some(x=>x.id===id),weapon=id=>Catalog.weapons.some(x=>x.id===id),pill=id=>Catalog.pills.some(x=>x.id===String(id).split('~')[0]);
  function item(id){if(!map.has(id)){const m=/^(p\d+)~([0-5])$/.exec(id);if(m&&map.has(m[1])){const q=+m[2];map.set(id,{...map.get(m[1]),id,q,stat:[.14,.20,.29,.39,.52,.68][q]});}}return map.get(id);}
  const pick=a=>a[Math.floor(Math.random()*a.length)],cap=(v,a,b)=>Math.min(b,Math.max(a,v)),scale=r=>1.21**r;
  function need(ok,msg){if(!ok)throw Error(msg);}
  function blank(){return {version:1,phase:'intro',last:Date.now(),world:{turn:0,echoes:[],flags:[],names:[],legacies:[]},c:null,draft:null};}
  function log(c,t){c.log.unshift(t);c.log=c.log.slice(0,120);}
  function money(c,n,why){need(Number.isSafeInteger(n)&&c.coin+n>=0,'灵石不足。可做差事或卖出闲置物。');c.coin+=n;c.ledger.unshift({why,n,b:c.coin});c.ledger=c.ledger.slice(0,80);}
  function add(c,id,n=1){need(item(id)&&Number.isSafeInteger(n)&&(c.bag[id]||0)+n>=0,'需要更多'+(item(id)?.name||'材料')+'。');c.bag[id]=(c.bag[id]||0)+n;if(!c.bag[id])delete c.bag[id];}
  function flag(c,f){if(f&&!c.flags.includes(f))c.flags.push(f);}
  function mod(c,k){const sum=c.traits.reduce((v,id)=>v+(Traits.find(t=>t.id===id)?.mods[k]||0),0);return Math.min(.6,sum)+Math.max(0,sum-.6)*.35;}
  function owns(c,name){return c.traits.some(id=>Traits.find(t=>t.id===id)?.name===name);}
  function bonus(c,kind){const x=item(c.arts[kind]);return x?x.stat*(1+Math.min(1,(c.master[x.id]||0)/60))*(c.forms?.[x.id]==='精修'?1.2:1)/(1+Math.max(0,c.r-x.realm)*.16):0;}
  const hpMax=c=>Math.round((100+12*c.r+4*c.s)*(1+mod(c,'maxhp'))),rate=c=>200*1.18**c.r*(density(c,c.region,c.loc)/100)*(1+mod(c,'xp')+bonus(c,'心法')+.06*c.garden)*(1+(c.buff.incense||0)),
    target=c=>Math.ceil(150*1.18**c.r*1.265**c.r*1.07**c.s);
  const paths=[[1,3],[0,2],[1,4],[0,4],[2,3]];
  const storySite=(c,r)=>[1,2,4,0,3][(c.story[r]||0)%5];
  const sideSite=(c,i)=>(i+(c.side[i]||0)+3)%5;
  function residents(r){return Almanac.people.map((p,i)=>({...p,i})).filter(p=>p.home===r).map((p,i)=>({...p,site:[1,0,3,4,2][i%5]}));}
  function density(c,r,i){if(c.area==='home')return 65;if(c.area==='road')return 50;if(c.area==='sect')return 115;return [78,98,125,108,175][i]+(r*7+i*3)%13;}
  function answer(r){return (r+1)%3;}
  function attuned(c,r){return c.flags.includes('vein_'+r);}
  function gates(c){let r=c.r,master=Math.max(0,...Object.values(c.arts).filter(id=>item(id).realm>=r-2).map(id=>c.master[id]||0));return [
    ['本境正传结案',(c.story[r]||0)>=Lore.chapters[r].nodes.length],
    ['辨明本境灵脉，在第五处地块破境',c.area==='city'&&attuned(c,r)&&c.region===r&&c.loc===4],
    ['近境功法心得 '+master+' / '+(2+2*r),master>=2+2*r],
    ...(r>=3?[['寻回本境遗物「'+Almanac.dungeons[r].relic+'」',c.relics.includes(r)]]:[]),
    ...(r>=6?[['道途印证 '+proof(c).have+' / '+proof(c).need,proof(c).have>=proof(c).need]]:[]),
    ['灵地供奉 '+fee(c)+' 灵石',c.coin>=fee(c)]];
  }
  const cities='白沙渡镇 照骨山集 南苇水镇 七桥县 雾港县 烬北边城 归魂津城 南潮府 穿云关城 双照京 赤沙军府 白雷天关 洗尘仙城 三川仙都 玄枢星城 镇岁王庭 五流天府 系因仙京 春亩道城 七州盟都 万籁圣城 合契天都 问心故都 天门道京'.split(' ');
  const cityRank=r=>r<3?'集镇':r<7?'州县':r<12?'府城':r<18?'仙城':'道域都城';
  function stops(c){
    const list=[{id:'home',r:0,name:'青溪药村',area:'home'},...cities.map((name,r)=>({id:'city'+r,r,name,area:'city'})),...Sects.list.map(s=>({id:s.id,r:s.region,name:s.name,area:'sect'}))];
    if(c.sect==='own')list.push({id:'own',r:c.foundRegion??c.region,name:c.founded,area:'sect'});
    return list;
  }
  function station(c){return c.area==='home'?'home':c.area==='city'&&c.loc===0?'city'+c.region:c.area==='sect'?c.temple:null;}
  function arrive(c,area,r,temple=null){c.area=area;c.region=r;c.loc=0;c.temple=temple;c.day++;c.scout=0;}
  function transferCost(c,r){return 2+Math.abs(c.region-r)*3;}
  function migrate(g){const c=g.c;if(c&&c.mapVersion!==2){const old=Math.ceil(62*1.2**c.r*1.085**(4*c.r+c.s));c.xp=Math.min(1,c.xp/old)*target(c);c.cultivating=false;c.tasks=c.tasks.filter(k=>k!=='train');if(!c.tasks.length)c.tasks=['work'];c.mapVersion=2;}if(c&&!c.area){c.area='city';c.stations=[];if(c.sect==='own')c.foundRegion=c.region;}return g;}
  function xp(c,n){let was=c.xp;const limit=target(c);c.xp=cap(c.xp+n,0,limit);if(limit-c.xp<1e-8)c.xp=limit;return c.xp-was;}
  function signup(g){need(['intro','dead','reborn'].includes(g.phase),'已有进行中的角色。');if(g.phase==='dead')Object.assign(g,blank());g.phase='draft';g.draft={name:'',round:0,hand:[],keep:[],boons:['手艺'],home:0};draw(g);}
  function draw(g){let d=g.draft;need(d&&d.round<5,'五次抽取已用完。');let next=[...d.keep];while(next.length<8){let v=Math.random()*100,q=[40,30,18,9,2.6,.4].findIndex(w=>(v-=w)<0);let pool=Traits.filter(t=>t.q===q&&!next.includes(t.id)&&(!t.root||next.filter(id=>Traits.find(t=>t.id===id)?.root).length<3));if(pool.length)next.push(pick(pool).id);}const fresh=next.filter(x=>!d.keep.includes(x));d.hand=d.round?d.hand.map(id=>d.keep.includes(id)?id:fresh.shift()):next;d.round++;}
  function boons(w){return ['手艺','路引','旧钱',...(w.turn>=3?['遗墨']:[]),...(w.turn>=5?['旧器']:[]),...(w.turn>=8?['故交']:[]),...(w.turn>=12?['道痕']:[]),...new Set((w.legacies||[]).map(id=>'宿缘·'+(Almanac.endings.find(x=>x.id===id)?.name||'旧渡')))];}
  function start(g){let d=g.draft;need(d.keep.length===5,'请留选五签。');need(d.keep.filter(id=>Traits.find(t=>t.id===id).root).length<=1,'主灵根最多一种，请更换一签。');
    let a=Catalog.arts.find(x=>x.realm===0&&x.kind==='心法'),w=Catalog.weapons[0],p=Catalog.pills.find(x=>x.kind==='疗伤');
    let c={name:(d.name.trim()||'沈舟').slice(0,12),traits:[...d.keep],r:0,s:0,xp:0,hp:100,breath:10,coin:0,bag:{h:4,ore:1},arts:{[a.kind]:a.id},weapon:w.id,skill:a.id,recipe:p.id,master:{},forge:{},brew:{},forms:{},formula:{},buff:{},ledger:[],log:[],flags:[],story:{},side:{},region:0,loc:0,day:1,scout:0,tasks:['work'],cultivating:false,mapVersion:2,area:'home',stations:[],credit:{},garden:0,insight:0,fail:0,market:{},deliveries:[],favor:0,merit:0,rank:0,duty:0,relations:{},relics:[],friends:{},disciples:[],home:d.home,sect:null,endings:[]};
    add(c,a.id);add(c,w.id);add(c,p.id);money(c,32,'药铺启程盘缠');if(g.world.turn){for(const k of d.boons){if(k==='手艺'){add(c,'h',4);c.brew[p.id]=3;}else if(k==='路引'){c.scout=3;c.breath=12;}else if(k==='旧钱')money(c,25,'前世寄存');else if(k==='旧器')c.forge[w.id]=2;else if(k==='故交')c.friends[0]=4;else if(k==='道痕')c.insight=3;else if(k==='遗墨')c.master[a.id]=8;else {c.insight++;add(c,'ore',2);}}c.relations={...g.world.heritage?.relations};log(c,g.world.echoes.at(-1));}if(c.home)add(c,c.home%2?'h':'ore',2);
    c.hp=hpMax(c);log(c,'师父在名册上写下你的道号，把药柜钥匙递来。从今往后，此身只有一条命。');g.c=c;g.draft=null;g.phase='play';g.last=Date.now();}
  function cost(x){return {h:x.craft?.herb||2+x.q,coin:x.craft?.coin||2+x.realm+x.q};}
  function brew(c,id){const x=item(id);need(pill(id)&&x.realm<=c.r,'尚不能承受此方炉火。');let k=cost(x),skill=c.brew[id]||0;need((c.bag.h||0)>=k.h&&c.coin>=k.coin,'药材或灵石不足。');add(c,'h',-k.h);money(c,-k.coin,'炉火 · '+x.name);let power=mod(c,'craft')+bonus(c,'百艺')+.05*c.disciples.filter(d=>d.post==='丹房').length;
    let q=x.q>0&&Math.random()>Math.min(.98,.55+skill*.04+power)?x.q-1:x.q;let n=1+(Math.random()<Math.min(.65,power+skill*.009)?1:0);if(c.formula[id]&&c.bag.h>=2){add(c,'h',-2);n++;}add(c,q===x.q?id:id+'~'+q,n);c.brew[id]=skill+1;return n+' 枚'+grades[q].split(' · ')[0]+'品'+x.name;}
  const marketEpoch=()=>Math.floor(Date.now()/14400000);
  function merchant(c){let epoch=marketEpoch(),key=epoch+'_'+c.region;for(const k in c.market)if(!k.startsWith(epoch+'_'))delete c.market[k];return c.market[key]??={moves:{},cash:Math.ceil(230*scale(c.region))};}
  function politics(c){const values=Sects.list.filter(s=>s.region===c.region).map(s=>c.relations[s.id]);return {war:values.includes('war'),ally:values.includes('alliance'),trade:values.includes('trade')};}
  function base(id){let x=item(id);if(id==='h')return 4;if(id==='ore')return 9;return Math.ceil((art(id)?24:weapon(id)?19:8)*scale(x.realm)*[1,1.35,1.95,3.1,5.5,9][x.q]);}
  function quote(c,id){let x=item(id),m=merchant(c),pol=politics(c),season=((marketEpoch()+c.region*3+x.name.length)%7-3)*.025,local=id==='h'&&[0,2,16].includes(c.region)?-.08:id==='ore'&&[1,5,10].includes(c.region)?-.08:0;
    let change=cap(-(m.moves[id]||0)*.02,-.12,.15)+season+local+(pol.war?.08:pol.ally?-.04:0),f=Math.min(.12,mod(c,'trade')*.45+(pol.trade?.035:0));return {buy:Math.ceil(base(id)*(1.26+change-f)),sell:Math.max(1,Math.floor(base(id)*(.49+change*.45+f*.5))),stock:Math.max(0,(id==='h'||id==='ore'?30:pill(id)?6:Math.max(1,4-x.q))+(m.moves[id]||0))};}
  const wares=c=>[...materials,...catalog.filter(x=>x.realm===c.region)];
  function trade(c,a){let {id,n,sell,price}=a,p=quote(c,id),m=merchant(c),unit=sell?p.sell:p.buy;need(Number.isInteger(n)&&n>0&&n<=99&&unit===price,'报价或数量有变化，请重新询价。');if(sell){let equipped=c.weapon===id||Object.values(c.arts).includes(id)||c.bond===id;need((c.bag[id]||0)-n>=(equipped?1:0),'数量不足，使用中的最后一件须保留。');need(m.cash>=n*unit,'商号收购余款不足。');add(c,id,-n);money(c,unit*n,'售出 '+item(id).name+' ×'+n);m.cash-=unit*n;}else{need(wares(c).some(x=>x.id===id)&&p.stock>=n,'此地现货不足。');money(c,-unit*n,'购入 '+item(id).name+' ×'+n);add(c,id,n);m.cash+=unit*n;}m.moves[id]=(m.moves[id]||0)+(sell?n:-n);return (sell?'售出':'购入')+item(id).name+' ×'+n+'，成交 '+unit*n+' 石。';}
  function lot(c){let epoch=Math.floor(Date.now()/300000);const a=catalog.filter(x=>x.realm===c.region).sort((x,y)=>y.q-x.q).slice(0,5),x=a[(epoch+c.region)%a.length],start=Math.ceil(base(x.id)*.78);return {id:x.id,key:epoch+'_'+c.region,until:(epoch+1)*300000,start,rival:Math.ceil(start*(1.04+(epoch%37)/100))};}
  function procurement(c){let k=marketEpoch()+c.region,id=k%2?'h':'ore',qty=3+k%3;return {key:k+'_'+c.region,id,qty,pay:Math.ceil(base(id)*qty*1.35)};}
  function settle(g,now=Date.now()){if(now<=g.last)return;const time=(now-g.last)/1000;g.last=now;if(g.phase!=='play')return;const c=g.c;let a=c.auction;if(a&&now>=a.until){if(a.amount>=a.rival){add(c,a.id);log(c,'落槌，竞得'+item(a.id).name+'。');}else{money(c,a.amount,'拍卖退回押金');log(c,'竞价未中，押金全退。');}c.auction=null;}
    c.breath=Math.min(12,c.breath+time/75);let rem=time,lines=[],off=1+(time>=90?mod(c,'offline'):0);
    for(const j of new Set([...(c.cultivating?['train']:[]),...c.tasks.filter(k=>k!=='train'),'work'])){if(rem<=.001)break;
      if(j==='train'){let speed=rate(c)*off/3600,t=Math.min(rem,(target(c)-c.xp)/speed);if(t>0){let n=xp(c,speed*t);rem-=t;lines.push('吐纳 +'+n.toFixed(1)+' 修为');}if(c.xp>=target(c)){c.cultivating=false;c.buff.incense=0;}continue;}
      if(j==='heal'){if(c.battle)continue;let speed=hpMax(c)/600*(1+mod(c,'heal')),t=Math.min(rem,(hpMax(c)-c.hp)/speed);if(t>0){c.hp=Math.min(hpMax(c),c.hp+speed*t);rem-=t;lines.push('气血 +'+Math.round(speed*t));}continue;}
      let id=j==='study'?c.skill:j==='brew'?c.recipe:j==='forge'?c.weapon:'',key=j+id,left=Infinity,period=({work:240,herb:180,study:210,brew:240,forge:540})[j]/off;
      if(j==='study'){period/=1+mod(c,'study');left=60-(c.master[id]||0);}else if(j==='forge')left=8-(c.forge[id]||0);else if(j==='brew'){let k=cost(item(id));left=Math.min(12-(c.credit['batch'+id]||0),Math.floor(c.coin/k.coin),Math.floor((c.bag.h||0)/(k.h+(c.formula[id]?2:0))));}
      if(left<=0)continue;let old=c.credit[key]||0,t=Math.min(rem,Math.max(0,left*period-old)),n=Math.min(left,Math.floor((t+old+1e-7)/period));rem-=t;c.credit[key]=Math.max(0,t+old-n*period);if(!n)continue;
      if(j==='work'){let v=n*Math.ceil(3*scale(c.r));money(c,v,'坊间差事');lines.push('差事 +'+v+' 灵石');}
      if(j==='herb'){let v=n*(1+c.garden+c.disciples.filter(d=>d.post==='药圃').length);add(c,'h',v);lines.push('青露草 +'+v);}
      if(j==='study'){c.master[id]=(c.master[id]||0)+n;lines.push('心得 +'+n);}
      if(j==='forge'){c.forge[id]=(c.forge[id]||0)+n;lines.push('温养 +'+n);}
      if(j==='brew'){for(let i=0;i<n;i++)lines.push('收炉 '+brew(c,id));c.credit['batch'+id]=(c.credit['batch'+id]||0)+n;}
    }if(time>=90)c.report={time,lines};}
  function proof(c){return {need:c.r<3?0:1+Math.floor(c.r/8),have:c.relics.filter(r=>r>=c.r-4).length+Object.keys(c.side).filter(i=>Lore.sidequests[i].realm>=c.r-4&&c.side[i]>=Lore.sidequests[i].nodes.length).length+(Object.values(c.arts).some(id=>item(id).realm>=c.r-2&&c.master[id]>=6)?1:0)};}
  const fee=c=>Math.ceil(10*1.27**c.r),chance=c=>Math.min(1,.96-.009*c.r+c.fail*.1+(c.buff.break||0)+Math.min(.05,c.insight*.007));
  function advance(c){need(c.xp+.00001>=target(c),'修为尚未积满。');need(c.r!==23||c.s!==3,'此身已至道祖圆满。');if(c.s===3){for(const [label,ok] of gates(c))need(ok,label);need(c.story[c.r]>=Lore.chapters[c.r].nodes.length,'请先完成本境正传。');need(proof(c).have>=proof(c).need,'所需道途印证尚未齐备。');money(c,-fee(c),'破境灵地');if(Math.random()>chance(c)){c.fail++;c.hp=Math.max(1,c.hp*.85);c.xp*=.87;return '未能破境，受损经脉留下了下一次可用的心得。';}c.r++;log(c,'通往'+cities[c.r]+'的关牒已开，由旧城驿口出发可步行前往。');c.s=0;c.fail=0;c.buff.break=0;}else c.s++;c.xp=0;c.hp=hpMax(c);log(c,'修至'+realms[c.r]+stages[c.s]+'。');return c.log[0];}
  function stamina(c,n){need(c.breath>=n,'行力不足，可回客舍休整或稍候自然恢复。');c.breath-=n;}
  function reward(c,r){let pool=catalog.filter(x=>x.realm===r&&x.q<=Math.min(5,2+c.scout+Math.floor(mod(c,'loot')*9)));if(Math.random()<.30+bonus(c,'秘术')&&pool.length){let x=pick(pool);add(c,x.id);log(c,'拾得'+x.name+'。');return x.name;}let n=Math.ceil((2+Math.random()*4)*scale(r)*(1+mod(c,'loot')+(c.pet?.level||0)*.025));money(c,n,'探索所得');add(c,Math.random()<.45?'ore':'h');return n+' 灵石与一份材料';}
  function use(c,id){let x=item(id);need(x&&(c.bag[id]||0)>0&&c.r>=x.realm,'数量或使用境界不足。');if(art(id)){c.arts[x.kind]=id;c.skill=id;return '装配《'+x.name+'》，已设为参悟目标。';}if(weapon(id)){c.weapon=id;return '执持'+x.name+'。';}need(pill(id),'材料用于炼制与改铸。');let v=x.stat/(1+.23*Math.max(0,c.r-x.realm));switch(x.kind){case '疗伤':need(c.hp<hpMax(c),'气血完足。');c.hp=Math.min(hpMax(c),c.hp+hpMax(c)*v*(1+mod(c,'heal')));break;case '突破':need((c.buff.break||0)<v*.4,'已有同等护脉药力。');c.buff.break=v*.4;break;case '修为':need(c.xp<target(c),'已达瓶颈。');need(!c.buff.incense,'已服聚气药，药力持续至本阶圆满。');c.buff.incense=v;break;case '探索':need(c.breath<12||c.scout<4,'行力与探路均已完足。');c.breath=Math.min(12,c.breath+2+Math.ceil(v*4));c.scout=Math.min(4,c.scout+1);break;case '斗法':need((c.buff.attack||0)<v,'斗法药力尚在。');c.buff.attack=v;break;default:add(c,'h',Math.max(1,Math.round(v*5)));break;}add(c,id,-1);return '服下'+x.name+'。';}
  function battle(c,name,hard=0){let hp=(54+11*c.region)*(1+hard*.25);c.battle={name,hp,max:hp,turn:0,hard,mode:Math.floor(Math.random()*3),text:'对手封住去路，留意他的下一招。'};}
  function die(g,name){let c=g.c;g.memory={name:c.name,realm:realms[c.r],reason:'与'+name+'交锋时力竭。',day:c.day};g.c=null;g.phase='dead';g.world=blank().world;return '身死道消，此世终结。';}
  function combat(g,action){let c=g.c,b=c.battle,w=item(c.weapon);need(b,'眼下没有战斗。');let k=action;if(action==='tech'){need(!b.tech,'此战已经施展器技。');b.tech=true;if(['铃','印','棍','琴','阵盘','拳套'].includes(w.kind)){k='guard';b.mode=0;c.hp=Math.min(hpMax(c),c.hp+hpMax(c)*.13);}else{k='quick';b.mode=2;}}
    if(k==='flee'&&Math.random()<cap(.56+.08*c.scout+mod(c,'flee')+bonus(c,'身法')-.1*b.hard,.15,.96)){c.battle=null;c.dungeon=null;return '你沿退路脱身了。';}
    if(k==='pill'){let id=Object.keys(c.bag).find(id=>pill(id)&&item(id).kind==='疗伤'&&item(id).realm<=c.r);need(id,'没有可用疗伤丹。');use(c,id);}
    let age=Math.max(w.realm,c.bond===w.id?c.bondRealm||0:0);let power=(16+c.r*3+c.s*1.4)*(1+mod(c,'attack')+bonus(c,'招式')+(c.buff.attack||0)+w.stat*(1+.075*(c.forge[w.id]||0))/(1+Math.max(0,c.r-age)*.24));let mul=k==='heavy'?(b.mode===1?.6:1.36):k==='quick'?(b.mode===2?1.55:1):k==='guard'?(b.mode===0?.84:.35):0;
    let hit=Math.round(power*mul);b.hp-=hit;if(b.hp<=0){c.battle=null;c.buff.attack=0;return '敌手退败，收得'+reward(c,c.region)+'。';}
    let loss=Math.max(1,Math.round((12+2*c.region+Math.random()*6)*(b.mode===0?1.5:.85)*(k==='guard'?.35:1)*(1+.2*b.hard)/(1+mod(c,'guard')+bonus(c,'辅修'))));c.hp-=loss;if(c.hp<=0)return die(g,b.name);b.mode=Math.floor(Math.random()*3);b.turn++;return b.text='你击中 '+hit+' 点，承伤 '+loss+' 点。';}
  function event(g){let c=g.c,p=c.pending;if(!p)return null;if(p.type==='enc'){let e=Lore.encounters[p.i];return {title:e.title,node:e};}let e=(p.type==='story'?Lore.chapters:Lore.sidequests)[p.i],node=e.nodes[p.n];let choices=[...node.choices];let medicine=Object.keys(c.bag).find(id=>pill(id)&&item(id).kind==='疗伤'&&item(id).realm<=c.r);
    if(p.type==='story'&&p.n===0&&[0,1].includes(p.i)&&medicine)choices.push({label:p.i?'先敷药，再拔刀':'敷药看清绳痕',text:p.i?'白猿将长命锁递到你手心。':'冷湿的绳痕浮现。绳的另一端还有人。',flag:p.i?'ape_friend':'rope_mark',consume:medicine});
    return {title:e.title,node:{...node,choices}};}
  function choices(g,o){return !o.requires||g.c.flags.includes(o.requires)||g.world.flags.includes(o.requires);}
  function decide(g,i){const c=g.c,p=c.pending,e=event(g),o=e.node.choices[i];need(o&&choices(g,o),'尚未获得所需线索。');if(o.consume)add(c,o.consume,-1);if(o.coin)money(c,Math.round(o.coin*scale(c.region)),'行旅 · '+e.title);if(o.herb)add(c,'h',o.herb);if(o.hp)c.hp=cap(c.hp+o.hp,1,hpMax(c));let fresh=o.flag&&!c.flags.includes(o.flag);flag(c,o.flag);if(fresh&&owns(c,'无字天书'))c.master[c.skill]=Math.min(60,(c.master[c.skill]||0)+1);log(c,o.text);
    if(p.type==='enc'){c.pending=null;if(o.battle)battle(c,e.title);else if(Math.random()<.4+mod(c,'loot'))reward(c,c.region);}
    else{const d=(p.type==='story'?Lore.chapters:Lore.sidequests)[p.i],track=p.type==='story'?c.story:c.side;track[p.i]=++p.n;c.pending=null;if(p.n>=d.nodes.length){c.pending=null;c.insight++;money(c,Math.ceil((p.type==='story'?9:5)*scale(c.region)),'结案 · '+d.title);if(p.type==='side')reward(c,d.realm);}}
    return o.text;}
  function crypt(g,op){let c=g.c,d=Almanac.dungeons[c.region];if(op==='enter'){need(c.loc===2,'秘境入口在第三处地块。');need(!c.dungeon,'已经入境。');stamina(c,1);c.dungeon={i:0,known:false};return '踏入'+d.name+'。';}let s=c.dungeon;need(s,'尚未入境。');if(op==='leave'){c.dungeon=null;return '沿原路安全退出。';}if(op==='scout'||op==='foresee'){need(!s.known,'这间已查明。');if(op==='foresee'){need(owns(c,'借来一日')&&!c.usedVision,'命格未能发动。');c.usedVision=true;}else if(c.breath>=1)stamina(c,1);else add(c,'ore',-1);s.known=true;return d.rooms[s.i].clue;}
    let unsafe=!s.known,room=d.rooms[s.i++];s.known=false;if(s.i>=d.rooms.length){c.dungeon=null;if(!c.relics.includes(c.region)){c.relics.push(c.region);c.insight++;log(c,'收得「'+d.relic+'」。'+d.after);}reward(c,c.region);}if(unsafe&&Math.random()<.55)battle(c,room.name+'守影',1);return '穿过'+room.name+'。';}
  function act(g,op,v={}){if(op==='signup')return signup(g);if(g.phase==='draft'){let d=g.draft;if(v.name!=null)d.name=String(v.name).slice(0,12);switch(op){case 'name':return;case 'draw':return draw(g);case 'lock':need(d.hand.includes(v.id),'命签已更新。');if(d.keep.includes(v.id))d.keep=d.keep.filter(id=>id!==v.id);else{need(d.keep.length<5,'最多留五签。');d.keep.push(v.id);}return;case 'home':need(Number.isInteger(v.i)&&v.i<=Math.min(7,Math.floor(g.world.turn/2)),'此出身尚未解锁。');d.home=v.i;return;case 'boon':{need(boons(g.world).includes(v.id),'宿缘未开。');let n=g.world.turn>=12?3:g.world.turn>=3?2:1;let picked=d.boons.includes(v.id)?d.boons.filter(x=>x!==v.id):n===1?[v.id]:[...d.boons,v.id];need(picked.length<=n,'宿缘已满。');d.boons=picked;return;}case 'start':return start(g);}}
    need(g.phase==='play','请先创建角色。');let c=g.c;if(op==='dismiss'){c.report=null;return;}
    if(op==='stop'){c.cultivating=false;return '收功起身。';}need(!c.cultivating,'请先收功，再处理身外之事。');
    if(c.battle)need(op==='combat','请先战斗或撤离。');else if(c.dungeon)need(op==='crypt','请先探完秘境或撤出。');else if(c.pending)need(op==='choose','眼前的事件尚未处理。');const {id,i}=v;
    if(['begin','meet','askVein','survey','travel','explore'].includes(op)||op==='crypt'&&id==='enter')need(c.area==='city','请先亲自进城，再到当地地块。');
    switch(op){
      case 'getPass':need(c.area==='home','药村的路引由梅婆看守。');flag(c,'village_pass');return '梅婆递来一张旧路引：「认准青布篷，顺堤走，白沙渡的城门就在渡船后面。」';
      case 'outside':need(['city','home','sect'].includes(c.area),'已在驿道上。');if(c.area==='city')need(c.loc===0,'先回城门驿口。');if(c.area==='home')need(c.flags.includes('village_pass'),'先向梅婆问路。');arrive(c,'road',c.region);return '已走上'+Lore.regions[c.region].name+'的驿道。';
      case 'road':need(c.area==='road'&&Number.isInteger(i)&&i>=0&&i<=c.r&&Math.abs(c.region-i)===1,'须从相邻驿道步行，且已达到通行境界。');arrive(c,'road',i);return '前方已可望见'+cities[i]+'。';
      case 'enterPlace':{let dest=stops(c).find(z=>z.id===id);need(c.area==='road'&&dest&&dest.r===c.region&&dest.r<=c.r,'请先沿驿道抵达此地。');arrive(c,dest.area,dest.r,dest.area==='sect'?id:null);flag(c,'visit_'+id);return '抵达'+dest.name+'。';}
      case 'attune':{let key=station(c);need(key&&!c.stations.includes(key),'请在尚未点亮的阵台留印。');c.stations.push(key);return '阵眼亮起。今后可从其他已点亮的阵台传送至此。';}
      case 'transfer':{let from=station(c),dest=stops(c).find(z=>z.id===id);need(from&&from!==id&&c.stations.includes(from)&&c.stations.includes(id)&&dest&&dest.r<=c.r,'两端阵台均须亲自点亮。');money(c,-transferCost(c,dest.r),'驿阵传送');arrive(c,dest.area,dest.r,dest.area==='sect'?id:null);return '抵达'+dest.name+'阵台。';}
      case 'sit':need(c.xp<target(c),'本阶修为已满。');need(c.loc!==4||attuned(c,c.region),'此处灵潮逆行，先向当地人问脉。');c.cultivating=true;return '调息入定，离线也会在此地修炼。';
      case 'askVein':need(c.loc===1,'请到第二处地块问路。');flag(c,'heard_'+c.region);return '问脉口述已录入行旅手记。';
      case 'survey':need(c.loc===2&&c.flags.includes('heard_'+c.region),'先去问脉，再到地头勘验。');need(!attuned(c,c.region),'灵脉已辨明。');stamina(c,1);if(i!==answer(c.region))return '气机散了，耗去一点行力。回看口述，再辨周围的征兆。';flag(c,'vein_'+c.region);log(c,'勘明'+Lore.regions[c.region].name+'灵脉，灵眼可供闭关。');return c.log[0];
      case 'advance':return advance(c);
      case 'travel':need(Number.isInteger(v.r)&&v.r>=0&&v.r<=c.r&&Lore.regions[v.r]?.locations[i],'尚不能抵达。');need(v.r===c.region&&paths[c.loc].includes(i),'须沿相连的山径行走；跨域请从第一处驿口启程。');c.region=v.r;c.loc=i;c.day++;c.scout=0;return '抵达'+Lore.regions[v.r].locations[i]+'。';
      case 'begin':{let source=v.type==='story'?Lore.chapters:Lore.sidequests,d=source[i],n=(v.type==='story'?c.story:c.side)[i]||0;need(d&&n<d.nodes.length&&(v.type==='story'?i:d.realm)<=c.r,'此事已有结局或时机未到。');need(c.region===(v.type==='story'?i:d.realm)&&c.loc===(v.type==='story'?storySite(c,i):sideSite(c,i)),'请到线索指向的地块。');c.pending={type:v.type,i,n};return;}
      case 'explore':{stamina(c,1);c.day++;if(id==='scout'){c.scout=Math.min(4,c.scout+1);add(c,'h');if(!c.pet&&!c.sighted&&Math.random()<.34)c.sighted=['青背鱼鹰','雪耳猿','寻药貂'][c.region%3];return '退路已查，拾得青露草。'+(c.sighted?'发现愿意亲近你的'+c.sighted+'。':'');}
        let a=Lore.encounters.filter(e=>e.realm==null||e.realm===c.region);if(!a.length)a=Lore.encounters;let local=a.filter((x,k)=>k%5===c.loc);if(local.length&&Math.random()<.58)a=local;const opt=a.filter(x=>x!==Lore.encounters[c.lastEncounter]);let e=pick(opt.length?opt:a);c.lastEncounter=Lore.encounters.indexOf(e);c.pending={type:'enc',i:c.lastEncounter,n:0};return;}
      case 'choose':return decide(g,i);
      case 'crypt':return crypt(g,id);
      case 'combat':return combat(g,id);
      case 'rest':money(c,-Math.ceil(3*scale(c.region)),'客舍');c.hp=Math.min(hpMax(c),c.hp+.4*hpMax(c));c.breath=Math.min(12,c.breath+5);c.buff.resist=0;c.day++;return '一夜安眠，伤势与药抗缓解。';
      case 'meet':{let n=Almanac.people[i],rank=c.friends[i]||0;need(residents(c.region).some(p=>p.i===i&&p.site===c.loc)&&rank<5,'此人不在或已成至交。');stamina(c,1);c.friends[i]=rank+1;if(rank===2){reward(c,c.region);flag(c,'friend_'+i);log(c,n.name+'赠你'+n.gift+'。');}if(rank===4)c.insight++;return rank<2?n.meeting:n.friend;}
      case 'tasks':need(Array.isArray(v.list)&&v.list.length&&v.list.every(j=>jobs[j]),'请选择有效安排。');c.tasks=[...new Set(v.list)].slice(0,4);return '已按此顺序安排闭关。';
      case 'use':return use(c,id);
      case 'craft':{let t=brew(c,id);log(c,'丹炉收成 '+t);return '收炉 '+t;}
      case 'recipe':need(pill(id)&&item(id).realm<=c.r,'境界不足。');c.recipe=id;c.credit['batch'+id]=0;return '已设为离线丹方，每批最多十二炉。';
      case 'formula':need((c.brew[id]||0)>=3,'亲炼三炉方能改方。');c.formula[id]=!c.formula[id];return c.formula[id]?'改用合剂，有余药时多用两份草，加收一枚丹。':'已还原丹方。';
      case 'form':need(c.bag[id]&&art(id)&&(c.master[id]||0)>=25&&!c.forms[id],'功法尚未大成或已有传承。');c.forms[id]=v.form==='兼济'?'兼济':'精修';if(c.forms[id]==='兼济')c.insight++;return '已定功法分支。';
      case 'bond':need(c.r>=5&&!c.bond,'金丹后可认主一器。');c.bond=c.weapon;c.bondRealm=item(c.weapon).realm;return '本命契已成。';
      case 'reforge':need(c.bond===c.weapon&&c.bondRealm<c.r,'须执本命器并进入更高境界。');add(c,'ore',-4);money(c,-Math.ceil(20*scale(c.r)),'本命重铸');c.bondRealm=c.r;return '本命器已随境重铸。';
      case 'garden':{let n=c.garden+1;need(n<=5,'洞府已修至最高。');add(c,'ore',-n);money(c,-n*22,'扩修洞府');c.garden=n;return '药圃与静室均已扩修。';}
      case 'pet':if(!c.pet){need(c.sighted,'先在探路时寻访灵兽。');add(c,'h',-3);c.pet={name:c.sighted,level:1};c.sighted=null;}else{need(c.pet.level<6,'灵兽已长成。');add(c,'h',-c.pet.level-2);c.pet.level++;}return '灵兽亲密提升，寻获更丰。';
      case 'disciple':need(c.r>=7&&c.disciples.length<3,'化神方可收徒，限三人。');money(c,-Math.ceil(26*scale(c.r)),'门下束脩');c.disciples.push({name:['阿稻','迟安','渡青'][c.disciples.length],post:'丹房'});return '新徒入门。';
      case 'post':{let d=c.disciples[i];need(d,'门下无此人。');d.post=d.post==='丹房'?'药圃':'丹房';return '调任'+d.post;}
      case 'trade':return trade(c,v);
      case 'bid':{let a=lot(c);need(a.key===v.key&&(!c.auction||c.auction.key===a.key),'拍场已经换品。');let old=c.auction?.amount||0;need(Number.isSafeInteger(v.n)&&v.n>=Math.max(old+1,a.start),'报价不足。');money(c,old-v.n,'拍卖押金 · '+item(a.id).name);c.auction={...a,amount:v.n};return '密价已递，落槌后结算。';}
      case 'deliver':{let t=procurement(c);need(!c.deliveries.includes(t.key),'此期已交付。');add(c,t.id,-t.qty);money(c,t.pay,'地方委托');c.favor++;c.deliveries.push(t.key);c.deliveries=c.deliveries.slice(-96);return '委托已交，记下一份人情。';}
      case 'favor':{need(c.favor>=2,'尚缺坊间人情。');c.favor-=2;let p=Catalog.pills.find(x=>x.realm===c.region&&x.kind==='疗伤')||Catalog.pills.find(x=>x.realm===c.region);add(c,p.id,2);return '坊主回礼：'+p.name+' ×2';}
      case 'join':{let s=Sects.list.find(x=>x.id===id);need(c.area==='sect'&&c.temple===id,'请先由驿道前往本门山门。');need(!c.sect&&s&&s.branches.includes(v.branch),'须由副宗入门。');c.sect=id;c.branch=v.branch;log(c,'拜入'+c.branch+'。');return c.log[0];}
      case 'found':need(!c.sect&&c.r>=17,'大罗散修方可开宗。');money(c,-Math.ceil(65*scale(c.r)),'开山立派');c.sect='own';c.foundRegion=c.region;c.founded=(String(v.name||'青溪灯院')).slice(0,12);c.branch=c.founded+'下院';c.rank=Sects.roles.length-1;return '山门已立。';
      case 'mission':{let m=Sects.missions[i];need(c.sect&&m,'先入宗门。');stamina(c,1);money(c,-m.cost,'差遣开支');c.duty++;c.merit+=Math.max(1,Math.round(m.merit*(1+mod(c,'sect')+mod(c,m.stat))));money(c,Math.ceil((m.cost+2)*scale(Math.floor(c.r/3))),'宗门俸钱');if(owns(c,'一世重诺')&&c.duty%8===0)c.insight++;log(c,m.success);return m.success;}
      case 'promote':{let n=c.rank+1;need(c.sect&&n<Sects.roles.length&&c.r>=Math.floor(n*1.35)&&c.duty>=2*n&&c.merit>=8*n,'此职所需境界、贡献或履历不足。');c.rank=n;c.merit-=8*n;return '晋任'+Sects.roles[n].name+'。';}
      case 'guildshop':{need(c.sect&&c.merit>=12,'需要十二点宗门贡献。');let a=Catalog.arts.filter(x=>x.realm===c.r),x=a[((Number(c.sect.slice(1))||0)+c.rank)%a.length];c.merit-=12;add(c,x.id);return '换得《'+x.name+'》。';}
      case 'treaty':{let t=Sects.treaties[i],other=Sects.list.find(s=>s.id===id);need(other&&id!==c.sect&&t&&c.rank>=Sects.roles.length-2,'外务职权不足。');need(c.relations[id]!==t.effect&&(t.effect!=='peace'||c.relations[id]==='war')&&(c.relations[id]!=='war'||t.effect==='peace'),'当前关系不能签署此约。');money(c,-t.cost,'外务 · '+t.name);c.relations[id]=t.effect;let vals=Object.values(c.relations);if(vals.filter(r=>['peace','alliance'].includes(r)).length>=3)flag(c,'ending_treaty');if(vals.filter(r=>r==='war').length>=3)flag(c,'ending_empire');log(c,other.name+' · '+t.name);return t.desc;}
      case 'end':{let e=Almanac.endings.find(x=>x.id===id);need(c.r===23&&c.story[23]>=Lore.chapters[23].nodes.length&&!c.endings.length&&e&&c.flags.includes(e.flag),'今生印证不足。');c.endings=[id];log(c,e.desc);return '当世纪事：《'+e.name+'》。';}
      case 'rebirth':{let e=Almanac.endings.find(x=>x.id===c.endings[0]);need(c.r===23&&e,'道祖立传后方可转世。');g.world.turn++;g.world.flags=[...new Set([...g.world.flags,...c.flags])];g.world.echoes.push(e.echo);g.world.names.push(c.name);g.world.legacies.push(e.id);g.world.heritage={relations:c.relations,founded:c.founded||null,relics:c.relics};g.phase='reborn';g.c=null;signup(g);return '旧世归卷，重入人间。';}
      default:throw Error('未识别的操作。');
    }}
  return {cities,cityRank,stops,station,transferCost,migrate,paths,storySite,sideSite,residents,density,answer,attuned,gates,realms,stages,grades,jobs,catalog,materials,item,art,weapon,pill,blank,act,settle,rate,target,hpMax,proof,fee,chance,event,choices,cost,quote,merchant,wares,lot,procurement,boons,scale,politics};
})();
