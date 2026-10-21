require('dotenv').config();
const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const pool = require('./database');
const { modules } = require('./content');

const app = express();
const port = Number(process.env.PORT || 3000);
const cookieName = 'craftlogic.sid';
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

function signSession(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, name: user.name, exp: Date.now() + 12 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
function getSession(req) {
  const raw = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!raw) return null;
  const [payload, signature] = decodeURIComponent(raw).split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest();
  let received;
  try { received = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.exp > Date.now() ? session : null;
  } catch { return null; }
}
function setSession(res, user) {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(signSession(user))}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${secure}`);
}
function requireUser(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  req.user = session;
  next();
}
function requireTeacher(req, res, next) {
  if (!['teacher', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Esta sección es para docentes.' });
  next();
}
function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (err, key) => err ? reject(err) : resolve(`${salt}:${key.toString('hex')}`)));
}
async function passwordMatches(password, stored) {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = await passwordHash(password, salt);
  const expected = Buffer.from(hash, 'hex');
  const actual = Buffer.from(candidate.split(':')[1], 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
function validModule(id) { return modules.find(module => module.id === Number(id)); }
function matchesSolution(module, blocks) {
  return Array.isArray(blocks) && blocks.length === module.solution.length && blocks.every((block, index) => block === module.solution[index]);
}
function cookieClear(res) {
  res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`);
}

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'MySQL conectado' }); }
  catch { res.status(503).json({ ok: false, database: 'MySQL no está disponible. Revisa .env y que el servicio esté iniciado.' }); }
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 100);
    const email = String(req.body.email || '').trim().toLowerCase().slice(0, 190);
    const password = String(req.body.password || '');
    const role = req.body.role === 'teacher' ? 'teacher' : 'student';
    if (role === 'teacher') {
      const configuredCode = process.env.TEACHER_INVITE_CODE || '';
      const suppliedCode = String(req.body.inviteCode || '');
      const expected = Buffer.from(configuredCode);
      const supplied = Buffer.from(suppliedCode);
      if (!configuredCode || expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
        return res.status(403).json({ error: 'El código de invitación docente no es válido.' });
      }
    }
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Escribe tu nombre, un correo válido y una contraseña de al menos 8 caracteres.' });
    }
    const hash = await passwordHash(password);
    const [result] = await pool.execute('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', [name, email, hash, role]);
    const user = { id: result.insertId, name, email, role };
    setSession(res, user);
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const [rows] = await pool.execute('SELECT id,name,email,role,password_hash FROM users WHERE email=? LIMIT 1', [email]);
    if (!rows.length || !(await passwordMatches(String(req.body.password || ''), rows[0].password_hash))) return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    const { id, name, role } = rows[0];
    setSession(res, { id, name, role });
    res.json({ user: { id, name, email: rows[0].email, role } });
  } catch (err) { next(err); }
});

app.post('/api/auth/logout', (_req, res) => { cookieClear(res); res.json({ ok: true }); });
app.get('/api/me', requireUser, async (req, res, next) => {
  try {
    const [[user]] = await pool.execute('SELECT id,name,email,role FROM users WHERE id=?', [req.user.id]);
    if (!user) { cookieClear(res); return res.status(401).json({ error: 'La cuenta ya no existe.' }); }
    const [progress] = await pool.execute('SELECT module_id,best_score,attempts,completed_at FROM progress WHERE user_id=?', [user.id]);
    const [[metrics]] = await pool.execute('SELECT COUNT(*) AS attempts,COALESCE(SUM(success),0) AS wins FROM attempts WHERE user_id=?', [user.id]);
    const [badges] = await pool.execute('SELECT a.title,a.description,a.icon,ua.earned_at FROM user_achievements ua JOIN achievements a ON a.id=ua.achievement_id WHERE ua.user_id=? ORDER BY ua.earned_at', [user.id]);
    const [assignments] = await pool.execute('SELECT a.id,a.module_id,a.note,a.due_date,t.name AS teacher_name,p.completed_at FROM assignments a JOIN users t ON t.id=a.teacher_id LEFT JOIN progress p ON p.user_id=a.student_id AND p.module_id=a.module_id WHERE a.student_id=? ORDER BY a.created_at DESC', [user.id]);
    let totalStudents = 0;
    if (['teacher', 'admin'].includes(user.role)) {
      const [[row]] = await pool.execute('SELECT COUNT(DISTINCT student_id) AS total FROM assignments WHERE teacher_id=?', [user.id]);
      totalStudents = row.total;
    }
    res.json({ user, progress, metrics, badges, assignments, totalStudents, modules: modules.map(({ solution, palette, labels, quiz, ...m }) => m) });
  } catch (err) { next(err); }
});

app.get('/api/modules/:id', requireUser, (req, res) => {
  const module = validModule(req.params.id);
  if (!module) return res.status(404).json({ error: 'No encontramos ese módulo.' });
  const { solution, quiz, ...publicModule } = module;
  res.json({ module: { ...publicModule, ...(quiz ? { quiz: quiz.map(({ answer, ...question }) => question) } : {}) } });
});

app.post('/api/attempts', requireUser, async (req, res, next) => {
  try {
    const module = validModule(req.body.moduleId);
    if (!module) return res.status(400).json({ error: 'Módulo no válido.' });
    const blocks = Array.isArray(req.body.blocks) ? req.body.blocks.slice(0, 24) : [];
    const answers = Array.isArray(req.body.answers) ? req.body.answers.slice(0, 7).map(n => Number(n)) : [];
    const success = module.id === 7
      ? answers.length === module.quiz.length && module.quiz.every((question, index) => answers[index] === question.answer)
      : matchesSolution(module, blocks);
    const score = success ? (module.id === 7 ? 100 : Math.max(60, 100 - Math.max(0, blocks.length - module.solution.length) * 5)) : 0;
    await pool.execute('INSERT INTO attempts (user_id,module_id,blocks,success,score) VALUES (?,?,?,?,?)', [req.user.id, module.id, JSON.stringify(module.id === 7 ? answers : blocks), success, score]);
    await pool.execute(`INSERT INTO progress (user_id,module_id,best_score,attempts,completed_at) VALUES (?,?,?,1,?)
      ON DUPLICATE KEY UPDATE best_score=GREATEST(best_score,VALUES(best_score)),attempts=attempts+1,completed_at=IF(VALUES(completed_at) IS NULL,completed_at,COALESCE(completed_at,VALUES(completed_at)))`, [req.user.id, module.id, score, success ? new Date() : null]);
    if (success) {
      const [[row]] = await pool.execute('SELECT COUNT(*) AS total FROM progress WHERE user_id=? AND completed_at IS NOT NULL', [req.user.id]);
      const earned = row.total >= 7 ? 3 : row.total >= 3 ? 2 : 1;
      await pool.execute('INSERT IGNORE INTO user_achievements (user_id,achievement_id) VALUES (?,?)', [req.user.id, earned]);
    }
    res.json({ success, score, feedback: success ? ['¡Reto superado! Excelente lógica.','¡Lo lograste! La secuencia funciona.'][module.id === 2 ? 1 : 0] : module.id === 7 ? 'Revisa tus respuestas y vuelve a intentarlo.' : 'Todavía no funciona. Revisa el orden de los bloques y prueba de nuevo.' });
  } catch (err) { next(err); }
});

app.get('/api/teacher/overview', requireUser, requireTeacher, async (req, res, next) => {
  try {
    const [students] = await pool.execute(`SELECT DISTINCT u.id,u.name,u.email FROM assignments a JOIN users u ON u.id=a.student_id WHERE a.teacher_id=? ORDER BY u.name`, [req.user.id]);
    for (const student of students) {
      const [progress] = await pool.execute('SELECT module_id,best_score,attempts,completed_at FROM progress WHERE user_id=? ORDER BY module_id', [student.id]);
      student.progress = progress;
      student.completed = progress.filter(item => item.completed_at).length;
    }
    res.json({ students });
  } catch (err) { next(err); }
});

app.post('/api/assignments', requireUser, requireTeacher, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const moduleId = Number(req.body.moduleId);
    const note = String(req.body.note || '').trim().slice(0, 500);
    const dueDate = req.body.dueDate ? String(req.body.dueDate).slice(0, 10) : null;
    if (!validModule(moduleId)) return res.status(400).json({ error: 'Selecciona un módulo válido.' });
    const [rows] = await pool.execute('SELECT id FROM users WHERE email=? AND role="student" LIMIT 1', [email]);
    if (!rows.length) return res.status(404).json({ error: 'No encontramos una cuenta de estudiante con ese correo.' });
    await pool.execute('INSERT INTO assignments (teacher_id,student_id,module_id,note,due_date) VALUES (?,?,?,?,?)', [req.user.id, rows[0].id, moduleId, note, dueDate || null]);
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

function makeRoomCode() { return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6); }
app.post('/api/rooms', requireUser, async (req, res, next) => {
  try {
    const moduleId = Number(req.body.moduleId);
    if (!validModule(moduleId)) return res.status(400).json({ error: 'Selecciona un módulo válido.' });
    for (let tries = 0; tries < 4; tries++) {
      const code = makeRoomCode();
      try {
        const [result] = await pool.execute('INSERT INTO rooms (code,module_id,created_by) VALUES (?,?,?)', [code, moduleId, req.user.id]);
        await pool.execute('INSERT INTO room_events (room_id,user_id,message) VALUES (?,?,?)', [result.insertId, req.user.id, 'creó una sala de colaboración']);
        return res.status(201).json({ code });
      } catch (err) { if (err.code !== 'ER_DUP_ENTRY') throw err; }
    }
    res.status(500).json({ error: 'No pudimos crear una sala. Intenta otra vez.' });
  } catch (err) { next(err); }
});
app.post('/api/rooms/join', requireUser, async (req, res, next) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const [rooms] = await pool.execute('SELECT id FROM rooms WHERE code=?', [code]);
    if (!rooms.length) return res.status(404).json({ error: 'No encontramos una sala con ese código.' });
    await pool.execute('INSERT INTO room_events (room_id,user_id,message) VALUES (?,?,?)', [rooms[0].id, req.user.id, 'se unió a la sala']);
    res.json({ code });
  } catch (err) { next(err); }
});
app.get('/api/rooms/:code', requireUser, async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT r.id,r.module_id,e.id AS event_id,e.message,e.created_at,u.name FROM rooms r LEFT JOIN room_events e ON e.room_id=r.id LEFT JOIN users u ON u.id=e.user_id WHERE r.code=? ORDER BY e.id DESC LIMIT 30', [String(req.params.code).toUpperCase()]);
    if (!rows.length) return res.status(404).json({ error: 'No encontramos esa sala.' });
    res.json({ moduleId: rows[0].module_id, events: rows.filter(row => row.event_id).reverse().map(row => ({ id: row.event_id, message: row.message, at: row.created_at, name: row.name })) });
  } catch (err) { next(err); }
});
app.post('/api/rooms/:code/events', requireUser, async (req, res, next) => {
  try {
    const message = String(req.body.message || '').trim().slice(0, 240);
    if (!message) return res.status(400).json({ error: 'Escribe un mensaje corto.' });
    const [room] = await pool.execute('SELECT id FROM rooms WHERE code=?', [String(req.params.code).toUpperCase()]);
    if (!room.length) return res.status(404).json({ error: 'No encontramos esa sala.' });
    await pool.execute('INSERT INTO room_events (room_id,user_id,message) VALUES (?,?,?)', [room[0].id, req.user.id, message]);
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

app.use('/api', (err, _req, res, _next) => {
  console.error('API error:', err.code || err.name || 'Error');
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ER_BAD_DB_ERROR' || err.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(503).json({ error: 'No hay conexión a MySQL. Sigue los pasos de instalación en README.md.' });
  }
  res.status(500).json({ error: 'Ocurrió un error. Intenta de nuevo en un momento.' });
});

app.get('*path', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
app.listen(port, () => console.log(`CraftLogic disponible en http://localhost:${port}`));
