const PDFDocument=require('pdfkit');
const pool=require('./database');
const {modules}=require('../public/expeditions');
module.exports=async function certificate(req,res,next){
  try {
    const ids=modules.map(m=>m.id);
    const [rows]=await pool.query("SELECT u.name, MAX(p.completed_at) AS finished FROM users u JOIN progress p ON u.id=p.user_id WHERE u.id=? AND u.role='student' AND p.module_id IN (?) AND p.completed_at IS NOT NULL GROUP BY u.id,u.name HAVING COUNT(DISTINCT p.module_id)=?",[req.user.id,ids,ids.length]);
    if(!rows.length)return res.status(403).json({error:'Completa todas las expediciones para obtener tu certificado.'});
    const {name,finished}=rows[0];
    const date=new Intl.DateTimeFormat('es-PA',{dateStyle:'long',timeZone:'America/Panama'}).format(finished);
    const doc=new PDFDocument({layout:'landscape',size:'A4',margin:50,info:{Title:'Certificado CraftLogic'}});
    res.set('Cache-Control','private, no-store').attachment('Certificado-CraftLogic.pdf');
    doc.pipe(res);
    doc.rect(20,20,doc.page.width-40,doc.page.height-40).lineWidth(3).stroke('#235651');
    const center={align:'center'};
    doc.fillColor('#235651').font('Helvetica-Bold').fontSize(24).text('CraftLogic',50,78,center);
    doc.fontSize(38).text('Certificado de culminación',50,141,center);
    doc.font('Helvetica').fontSize(16).text('Otorgado a',50,218,center);
    doc.font('Helvetica-Bold').fontSize(26).text(name.normalize('NFC').replace(/[\x00-\x1f]/g,' '),50,253,center);
    doc.font('Helvetica').fontSize(18).text('¡Felicitaciones por completar las seis expediciones de programación!',50,377,center);
    doc.fontSize(14).text('Fecha de culminación: '+date,50,449,center);
    doc.end();
  }catch(error){next(error);}
};
