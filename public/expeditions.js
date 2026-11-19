'use strict';
// The browser and server replay exactly the same moves.
const Expeditions = (() => {
  const catalog = [
    [1,'Pradera del puente','Planifica una ruta','Recoge madera (M), cruza el agua y lleva el cristal al portal.',[
      'S..#..C','.#.#.#.','.M.~..P','...#...']],
    [2,'Cañón de los ecos','Secuencias','Activa las balizas 1, 2 y 3 en orden. Busca los pasos entre las paredes.',[
      'S...#3P','.#1.#..','.#..#..','...2...','##...#.']],
    [3,'Bosque de cobre','Condiciones','La palanca (!) alterna las puertas (D). Abre el paso y recoge ambos cristales.',[
      'S.!#C..','.#.#.#.','C#.D..P','...#...']],
    [4,'Canales de hielo','Patrones','Reconoce el patrón de cada isla. Cada cruce de agua consume una madera la primera vez.',[
      'S.M#C.M#..C','...~...~..P','.#.#.#.#.#.','...#...#...']],
    [5,'Mina de ámbar','Recursos limitados','Hay dos tablones y tres cruces. Elige los que llevan a los dos cristales.',[
      'S.M#C..#..C','...~...~..P','.M.#...#...','##~########','...#...#...']],
    [7,'Cumbre del faro','Evaluación de campo','Combina la secuencia de balizas, el puente y la puerta. Reúne los cristales antes de llegar al faro.',[
      'S1.#.2.#C.P','.M.~...D.#3','.#.#.!.#...','C..#...#...']]
  ];
  const modules=catalog.map(([id,title,lesson,goal,map],i)=>({id,title,lesson,goal,map,number:i+1,target:[12,12,16,15,19,26][i],icon:['🌱','🪨','🌲','❄️','⛏️','🔆'][i]}));
  const directions={N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]};
  function start(m){
    const grid=m.map.map(row=>[...row]);
    const y=grid.findIndex(row=>row.includes('S'));
    return {grid,x:grid[y].indexOf('S'),y,wood:0,open:false,next:1,won:false,moves:0};
  }
  function step(s,dir){
    if(s.won || !Object.hasOwn(directions,dir))return 'Movimiento no disponible.';
    const [dx,dy]=directions[dir], x=s.x+dx,y=s.y+dy,t=s.grid[y]?.[x];
    if(!t || t==='#')return 'Roca. Busca otro camino.';
    if(t==='~' && !s.wood)return 'Necesitas madera para construir aquí.';
    if(t==='D' && !s.open)return 'La puerta está cerrada. Busca la palanca.';
    if(/^[1-3]$/.test(t) && Number(t)!==s.next)return 'Activa primero la baliza '+s.next+'.';
    let message='Sigue explorando.';
    if(t==='P' && s.grid.some(row=>row.some(c=>'C123'.includes(c))))return 'Todavía quedan cristales o balizas.';
    if(t==='M'){s.wood++;message='Madera recogida.';}
    if(t==='~'){s.wood--;message='Construiste un puente.';}
    if(t==='C')message='Cristal recogido.';
    if('123'.includes(t)){s.next++;message='Baliza activada.';}
    if(t==='!'){s.open=!s.open;message=s.open?'Puerta abierta.':'Puerta cerrada.';}
    if('MC123~'.includes(t))s.grid[y][x]=t==='~'?'=':'.';
    s.x=x;s.y=y;s.moves++;s.won=t==='P';
    return s.won?'¡Portal alcanzado!':message;
  }
  return {modules,start,step,directions};
})();
if(typeof module!=='undefined')module.exports=Expeditions;

