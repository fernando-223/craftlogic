const crypto = require('node:crypto');
const mail = require('nodemailer');
const pool = require('./database');

function problem(status, message) {
  return Object.assign(new Error(message), { publicStatus: status });
}

async function transaction(task) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const result = await task(db);
    await db.commit();
    return result;
  } catch (error) {
    await db.rollback();
    throw error;
  } finally { db.release(); }
}

const digest = (key, ticket, code) => crypto.createHmac('sha256', key)
  .update(ticket + ':' + code).digest();

async function sendCode(name, email, passwordHash, key) {
  const env = process.env;
  const missing=['SMTP_HOST','SMTP_USER','SMTP_PASS','SMTP_FROM'].filter(key=>!env[key]?.trim());
  if (missing.length) {
    throw problem(503,'Correo pendiente de configuración. Indica al administrador que faltan: '+missing.join(', ')+'.');
  }
  const port=Number(env.SMTP_PORT || 587);
  if(!Number.isInteger(port)||port<1||port>65535)throw problem(503,'El administrador debe revisar SMTP_PORT.');
  const ticket = crypto.randomBytes(24).toString('hex');
  const code = String(crypto.randomInt(1000000)).padStart(6,'0');
  const now = Date.now();
  await transaction(async db => {
    await db.execute('DELETE FROM teacher_pending WHERE window_start < ?', [now-86400000]);
    await db.execute('INSERT INTO teacher_pending(email,window_start) VALUES (?,?) ON DUPLICATE KEY UPDATE email=email',[email,now]);
    const [[row]] = await db.execute('SELECT * FROM teacher_pending WHERE email=? FOR UPDATE',[email]);
    const [[existing]] = await db.execute('SELECT id FROM users WHERE email=?',[email]);
    if (existing) throw problem(409,'Este correo ya tiene una cuenta.');
    const reset = now - row.window_start >= 3600000;
    if (!reset && row.sends >= 3) {
      throw problem(429,'Alcanzaste el límite de tres envíos. Vuelve en '+Math.ceil((row.window_start+3600000-now)/60000)+' min.');
    }
    if(now-row.sent_at<60000)throw problem(429,'Puedes solicitar otro código en '+Math.ceil((row.sent_at+60000-now)/1000)+' segundos.');
    await db.execute('UPDATE teacher_pending SET name=?,password_hash=?,ticket=?,digest=?,expires=?,tries=0,sent_at=?,sends=?,window_start=? WHERE email=?',
      [name,passwordHash,ticket,digest(key,ticket,code),now+600000,now,reset?1:row.sends+1,reset?now:row.window_start,email]);
  });
  const smtp=mail.createTransport({host:env.SMTP_HOST,port,secure:port===465,requireTLS:port!==465,
    auth:{user:env.SMTP_USER,pass:env.SMTP_PASS},connectionTimeout:10000,socketTimeout:20000});
  try {
    await smtp.sendMail({from:env.SMTP_FROM,to:{address:email,name:''},subject:'Verifica tu correo en CraftLogic',
      text:'Tu código de verificación docente es '+code+'. Caduca en 10 minutos. Si no solicitaste el registro, ignora este mensaje.'});
  } catch {
    await pool.execute('UPDATE teacher_pending SET expires=0 WHERE ticket=?',[ticket]);
    throw problem(503,'No pudimos enviar el correo. Comprueba la dirección y vuelve a intentarlo en un minuto. Si persiste, avisa al administrador.');
  }
  return { ticket, pending:true };
}

async function verify(ticket, code, key) {
  if (!/^[a-f0-9]{48}$/.test(ticket) || !/^\d{6}$/.test(code)) throw problem(400,'Escribe los seis dígitos del correo.');
  const result=await transaction(async db=>{
    const [[row]]=await db.execute('SELECT * FROM teacher_pending WHERE ticket=? FOR UPDATE',[ticket]);
    if (!row || row.expires<=Date.now()) throw problem(410,'El código caducó o fue reemplazado. Solicita otro.');
    if (row.tries>=5) throw problem(429,'Agotaste los cinco intentos. Solicita otro código.');
    if (!crypto.timingSafeEqual(row.digest,digest(key,ticket,code))) {
      await db.execute('UPDATE teacher_pending SET tries=tries+1 WHERE ticket=?',[ticket]);
      return {error:row.tries===4?'Agotaste los intentos. Solicita otro código.':'Código incorrecto. Revisa los seis dígitos.'};
    }
    const [created]=await db.execute("INSERT INTO users(name,email,password_hash,role) VALUES (?,?,?,'teacher')",[row.name,row.email,row.password_hash]);
    await db.execute('DELETE FROM teacher_pending WHERE ticket=?',[ticket]);
    return {id:created.insertId,name:row.name,email:row.email,role:'teacher'};
  });
  if (result.error) throw problem(400,result.error);
  return result;
}
module.exports={sendCode,verify};
