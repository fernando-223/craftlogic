function drawValley(canvas,game,mission){
  const ctx=canvas.getContext('2d'),rows=game.grid, w=canvas.width,h=canvas.height;
  const colors=['#97c36b','#e5ac77','#72b49a','#b0dbe2','#d0aa70','#a5b895'];
  const grass=colors[mission.number-1];
  const unit=Math.min((w-64)/rows[0].length,(h-85)/(rows.length*.72));
  const depth=unit*.72,left=(w-unit*rows[0].length)/2,top=(h-depth*rows.length)/2+8;
  const gradient=ctx.createLinearGradient(0,0,0,h);
  gradient.addColorStop(0,'#254c60');gradient.addColorStop(1,'#14323d');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  function rect(x,y,a,b,color){ctx.fillStyle=color;ctx.fillRect(x,y,a,b);}
  function cube(x,y,size,height,face,side){
    rect(x,y-height,size,size*.72,face);
    rect(x,y-height+size*.72,size,height,side);
    rect(x+2,y-height+2,size-4,2,'#ffffff45');
  }
  function mark(x,y,symbol,color){
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.round(unit*.34)+'px system-ui';
    ctx.fillStyle=color;ctx.fillText(symbol,x+unit/2,y+depth*.41);
  }
  rows.forEach((row,j)=>row.forEach((tile,i)=>{
    const x=left+i*unit,y=top+j*depth;
    cube(x,y,unit-1,5,tile==='~'?'#43a9c3':grass,'#507660');
    if(tile==='#'){
      cube(x+2,y-1,unit-5,unit*.28,'#82979b','#516870');
      rect(x+unit*.15,y-unit*.12,unit*.23,3,'#b4c2bf');
    }else if(tile==='='||tile==='M'){
      for(let k=0;k<3;k++)cube(x+unit*.16,y+k*unit*.13,unit*.66,3,'#cb985c','#946c42');
      if(tile==='M')mark(x,y,'M','#312917');
    }else if(tile==='C'){
      ctx.fillStyle='#1e738b';ctx.beginPath();ctx.moveTo(x+unit*.5,y-5);ctx.lineTo(x+unit*.72,y+depth*.24);ctx.lineTo(x+unit*.5,y+depth*.73);ctx.lineTo(x+unit*.28,y+depth*.24);ctx.closePath();ctx.fill();
      rect(x+unit*.45,y+2,unit*.1,unit*.18,'#a4fffa');
    }else if(tile==='P'){
      rect(x+unit*.13,y-6,unit*.74,depth*.85,'#683786');rect(x+unit*.23,y,unit*.54,depth*.60,'#e4aafc');mark(x,y,'P','#51256b');
    }else if('!D123'.includes(tile)){
      cube(x+unit*.15,y,unit*.7,6,tile==='D'&&!game.open?'#834a37':'#efd17c','#a87742');
      mark(x,y,tile==='D'&&game.open?'✓':tile,'#33262d');
    }else if(tile==='~'){mark(x,y,'≈','#d8fcff');}
    if(i===game.x&&j===game.y){
      const ax=x+unit*.32,ay=y+unit*.17;
      cube(ax,ay+unit*.15,unit*.36,unit*.19,'#f3a13e','#a94e24');
      cube(ax+unit*.02,ay-unit*.08,unit*.32,unit*.14,'#f6d9ac','#d89a68');
      rect(ax,ay-unit*.19,unit*.35,unit*.1,'#30494b');
      rect(ax+unit*.22,ay+unit*.015,unit*.045,unit*.05,'#243640');
    }
  }));
}
function renderLesson(){
  const m=state.lesson,page=el('section','expedition'),head=el('div','lesson-top');
  const game=Expeditions.start(m),actions=[];
  head.append(button('← Mapa','',loadDashboard),el('span','tag','Expedición '+m.number+' / 6 · '+m.lesson));
  const surface=el('div','playfield'),canvas=el('canvas');
  canvas.width=900;canvas.height=420;canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Mundo de bloques. Usa las flechas o W A S D para caminar.');
  surface.append(canvas);
  const hud=el('p','inventory'),feedback=el('p','notice','Busca tu primera ruta.'),pad=el('div','direction-pad');
  feedback.setAttribute('role','status');
  const restart=button('Reiniciar misión','',renderLesson);
  let saving=false,saved=false;
  async function save(){
    if(saving||saved)return;
    saving=true;restart.disabled=true;
    try{
      const r=await api('/attempts',{method:'POST',body:JSON.stringify({moduleId:m.id,actions})});
      if(!r.success)throw Error(r.feedback);
      saved=true;feedback.textContent='¡Expedición completada! '+r.score+' puntos guardados.';
      pad.replaceChildren(button('Volver al mapa','primary',loadDashboard));
    }catch(err){feedback.textContent=err.message;pad.replaceChildren(button('Volver a guardar','primary',save));}
    finally{saving=false;restart.disabled=false;}
  }
  function refresh(){
    drawValley(canvas,game,m);
    hud.textContent='Madera: '+game.wood+'   ·   Cristales pendientes: '+game.grid.flat().filter(t=>t==='C').length+'   ·   Pasos: '+game.moves;
  }
  function walk(dir){
    if(game.won)return;
    if(actions.length>=2048){feedback.textContent='Reinicia para probar otra ruta.';return;}
    const before=game.moves;
    feedback.textContent=Expeditions.step(game,dir);
    if(game.moves!==before)actions.push(dir);
    refresh();if(game.won)save();
  }
  const keys={ArrowUp:'N',ArrowDown:'S',ArrowLeft:'W',ArrowRight:'E',w:'N',s:'S',a:'W',d:'E'};
  page.onkeydown=e=>{if(keys[e.key]){e.preventDefault();walk(keys[e.key]);}};
  for(const [dir,name] of [['N','↑ Norte'],['W','← Oeste'],['S','↓ Sur'],['E','→ Este']]){
    const b=button(name,'',()=>walk(dir));b.dataset.dir=dir;pad.append(b);
  }
  const guide=el('aside','panel field-guide');
  guide.append(el('h2','','Tu misión'),el('p','',m.goal),el('p','small','Meta opcional: llega en '+m.target+' pasos para ganar 100 puntos.'),el('p','small','Camina con las flechas, WASD o estos botones. Pisa los objetos para usarlos.'),pad,hud,feedback,restart);
  const layout=el('div','play-layout');layout.append(surface,guide);
  page.append(head,el('h1','',m.title),layout);app.replaceChildren(page);refresh();canvas.focus({preventScroll:true});
}

