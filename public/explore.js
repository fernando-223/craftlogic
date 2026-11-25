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
  const m=state.lesson,[topic,task,...hints]=ValleyProgram.lessons[m.number-1];
  const page=el('section','expedition'),layout=el('div','play-layout'),stage=el('div','playfield');
  const canvas=el('canvas');canvas.width=900;canvas.height=420;
  canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Mapa de '+m.title);
  const mapText=el('details'),legend=el('pre','',m.map.join('\n'));
  mapText.append(el('summary','','Leer mapa por filas'),legend,el('p','','S: salida · P: portal · #: roca · M: madera · ~: agua · C: cristal · !: palanca · D: puerta · 1, 2, 3: balizas · punto: camino.'));
  const panel=el('aside','panel field-guide'),label=el('label','field','Tu programa · una instrucción por línea');
  const input=el('textarea');input.rows=8;input.maxLength=4096;input.spellcheck=false;
  if(m.number===2)input.value='este\nsur'; // The second line hits a wall.
  label.append(input);
  const feedback=el('p','notice','Edita tu ruta y pulsa Ejecutar.'),inventory=el('p','inventory');
  feedback.setAttribute('role','status');
  function paint(game,line,msg){
    drawValley(canvas,game,m);
    inventory.textContent=(line?'Línea '+line+' · ':'')+'Fila '+(game.y+1)+', columna '+(game.x+1)+' · Madera '+game.wood+' · '+msg;
  }
  paint(Expeditions.start(m),0,'Salida');
  let hint=0;
  const hintButton=button('Pedir pista','',()=>{feedback.textContent=hints[hint++];hintButton.disabled=hint===hints.length;});
  const run=button('Ejecutar programa','primary',async()=>{
    const source=input.value;
    if(!source.trim()){feedback.textContent='Añade una instrucción para empezar.';return;}
    run.disabled=true;input.readOnly=true;
    try{
      const frames=[];
      ValleyProgram.run(m,source,(game,line,msg)=>frames.push([structuredClone(game),line,msg]));
      const result=await api('/attempts',{method:'POST',body:JSON.stringify({moduleId:m.id,program:source})});
      paint(Expeditions.start(m),0,'Salida');
      for(const frame of frames){
        if(!page.isConnected)return;
        paint(...frame);
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,Math.min(200,5000/frames.length)));
      }
      feedback.textContent=result.feedback+(result.success?' '+result.score+' puntos guardados.':' Edita tu programa y vuelve a probar.');
    }catch(error){feedback.textContent=error.message;}
    finally{run.disabled=false;input.readOnly=false;}
  });
  const syntax=['norte · sur · este · oeste'];
  if(m.number>=3)syntax.push('si abierta este');
  if(m.number>=4)syntax.push('repetir 2 norte');
  if(m.number>=5)syntax.push('si madera sur');
  if(m.number===6)syntax.push('al cristal oeste');
  const commands=el('div','palette');
  for(const command of ['norte','sur','este','oeste',...syntax.slice(1)]){
    commands.append(button(command,'',()=>{if(input.readOnly)return;input.value+=(input.value&&!input.value.endsWith('\n')?'\n':'')+command;input.focus();}));
  }
  panel.append(el('h2','',topic),el('p','',m.goal),el('p','',task),el('p','small','Añade instrucciones con los botones o escribe y reordena las líneas. Puedes cambiar el rumbo y las repeticiones (2–9).'),commands,label,run,hintButton,feedback);
  stage.append(canvas);const scene=el('div');scene.append(stage,inventory,mapText);
  layout.append(scene,panel);page.append(button('← Mapa','',loadDashboard),el('h1','',m.title),layout);app.replaceChildren(page);const title=page.querySelector('h1');title.tabIndex=-1;title.focus();
}

