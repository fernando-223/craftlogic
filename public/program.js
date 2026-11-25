'use strict';
const ValleyProgram = (() => {
  const world = typeof module === 'undefined' ? Expeditions : require('./expeditions');
  const compass = {norte:'N',este:'E',sur:'S',oeste:'W'};
  const lessons = [
    ['Secuencias','Escribe un paso por línea.','Localiza la madera antes de cruzar el agua.','Sigue con el dedo el camino desde la salida hasta la madera.'],
    ['Depuración','Ordena los pasos para activar 1, 2 y 3.','Observa en qué baliza se detiene tu programa.','Corrige la primera instrucción que te aleja de la siguiente baliza.'],
    ['Condicionales','Ejecuta un movimiento con «si abierta» cuando la puerta esté abierta.','Mira qué cambia al pisar la palanca.','Usa la condición después de activar la palanca.'],
    ['Bucles','Usa «repetir» para recorrer un tramo recto.','Busca dos o más pasos iguales consecutivos.','Cuenta las casillas antes del giro.'],
    ['Variables','Consulta la variable madera con «si madera» y usa un bucle.','La madera aumenta al recogerla y disminuye al construir.','Comprueba tu inventario antes de elegir el cruce.'],
    ['Eventos','Combina un bucle, una condición y una reacción al recoger un cristal.','Programa «al cristal» antes de recogerlo.','El paso del evento ocurre justo después de recoger cada cristal posterior.']
  ];
  function run(m,source,observe){
    if(typeof source!=='string'||source.length>4096)throw Error('El programa admite hasta 4096 caracteres.');
    const lines=source.toLowerCase().split(/\r?\n/);
    if(lines.length>128)throw Error('El programa admite hasta 128 líneas.');
    const game=world.start(m),used=new Set();
    const rules=/^(?:(repetir [2-9]|si abierta|si madera|al cristal) +)?(norte|sur|este|oeste)$/;
    const parsed=[];
    for(let i=0;i<lines.length;i++){
      const line=lines[i].trim();
      if(!line)continue;
      const match=rules.exec(line);
      const op=match?.[1]||'';
      const level=op==='al cristal'?6:op==='si madera'?5:op.startsWith('repetir')?4:op==='si abierta'?3:1;
      if(!match||level>m.number)return {game,success:false,feedback:'Línea '+(i+1)+': '+(!match?'comprueba el verbo y el rumbo con los botones de instrucciones.':'esta instrucción se aprende en la expedición '+level+'.')};
      parsed.push({i,op,name:match[2]});
    }
    if(!parsed.length)return {game,success:false,feedback:'Escribe al menos una instrucción.'};
    let event,feedback='El recorrido terminó antes de alcanzar el portal.';
    function move(dir,line){
      const before=game.moves;
      const [dx,dy]=world.directions[dir];
      const tile=game.grid[game.y+dy]?.[game.x+dx];
      const msg=world.step(game,dir);
      if(observe)observe(game,line,msg);
      if(before===game.moves){feedback='Línea '+line+': '+msg;return false;}
      if(tile==='C' && event && !game.won){
        used.add('evento');
        // Each pickup fires once, including consecutive crystals.
        return move(event,line);
      }
      return true;
    }
    for(const {i,op,name} of parsed){
      if(game.won)break;
      const dir=compass[name];
      if(op==='al cristal'){event=dir;continue;}
      if(op.startsWith('si ')){
        if(op==='si abierta'?!game.open:game.wood===0)continue;
        used.add(op);
      }
      const count=op.startsWith('repetir')?Number(op.slice(-1)):1;
      if(count>1)used.add('bucle');
      let ok=true;
      for(let j=0;j<count&&!game.won&&ok;j++)ok=move(dir,i+1);
      if(!ok)break;
    }
    const needed=[[],[],['si abierta'],['bucle'],['si madera','bucle'],['condición','bucle','evento']][m.number-1];
    if(used.has('si abierta')||used.has('si madera'))used.add('condición');
    const missing=needed.filter(item=>!used.has(item));
    const success=game.won&&!missing.length;
    if(game.won)feedback=success?'¡Portal alcanzado!':'Llegaste al portal. Ahora incorpora: '+missing.join(', ')+'.';
    return {game,success,feedback};
  }
  return {run,lessons};
})();
if(typeof module!=='undefined')module.exports=ValleyProgram;
