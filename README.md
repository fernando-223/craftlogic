# CraftLogic

CraftLogic es un software educativo en español para estudiantes de 10 a 15 años. Está desarrollado con JavaScript, Node.js, Express y MySQL.

- **Aplicación:** [craftlogic.pro](https://craftlogic.pro)
- **Estado de la base de datos:** [comprobar conexión MySQL](https://craftlogic.pro/api/health)

## Funciones

- Registro e inicio de sesión para estudiantes y docentes.
- Seis expediciones por mundos de bloques para practicar rutas, secuencias, condiciones y gestión de recursos.
- Editor de instrucciones con simulación por pasos, pistas graduales y corrección de programas. Las seis expediciones practican secuencias, depuración, condiciones, bucles, inventario y eventos.
- Seguimiento del progreso, intentos e insignias.
- Panel docente para asignar módulos y revisar el avance de estudiantes.
- Salas de colaboración con código y registro de actividad. No incluyen sincronización del juego en tiempo real.
- Interfaz adaptable, navegación por teclado y contraste claro u oscuro.

## Despliegue actual

La aplicación está desplegada como servicio Docker en Render. La base de datos MySQL está alojada en Aiven y se conecta mediante TLS. Revisa en Render la rama conectada y el ajuste de despliegue automático antes de subir cambios.

En **Render → craftlogic → Environment** deben estar configuradas estas variables:

| Variable | Valor |
| --- | --- |
| `DB_HOST` | Host del servicio MySQL de Aiven |
| `DB_PORT` | Puerto MySQL indicado por Aiven |
| `DB_NAME` | `craftlogic` |
| `DB_USER` | `craftlogic_app` |
| `DB_PASSWORD` | Contraseña actual de `craftlogic_app` |
| `DB_SSL_CA` | Certificado CA completo de Aiven |

Las contraseñas y certificados se guardan en las variables privadas de Render, nunca en GitHub ni en este README. No restablezcas la contraseña de `avnadmin` para la aplicación: debe coincidir con la del usuario `craftlogic_app`.

Al iniciar, la aplicación prepara las tablas de `database/schema.sql` de forma idempotente. No es necesario ejecutar scripts SQL manualmente en Aiven. Para comprobar que la app está activa y conectada, abre el endpoint de estado de arriba; una conexión correcta devuelve `ok: true` y `MySQL conectado`.

## Verificación del correo docente

El registro de estudiante es inmediato. Para una cuenta docente, CraftLogic envía seis dígitos al correo indicado. El registro pendiente queda separado de las cuentas activas. MySQL almacena un resumen HMAC del código y la contraseña derivada con scrypt. Cada código dura diez minutos, admite cinco intentos y se reemplaza al reenviar. Se permiten tres envíos por dirección en una hora con al menos un minuto entre ellos. La creación de la cuenta y el consumo del código se confirman en la misma transacción. Las cuentas existentes conservan su acceso.

Configura SMTP_HOST (servidor), SMTP_PORT (puerto), SMTP_USER (usuario), SMTP_PASS (credencial privada del proveedor) y SMTP_FROM (remitente autorizado). Mantén SESSION_SECRET privado, aleatorio y estable entre instancias. Si faltan variables, el formulario indica sus nombres para que el administrador complete la configuración. Si SMTP_PORT se omite, el valor predeterminado es 587. En el puerto 465 se usa TLS directo y en los demás se exige STARTTLS.

- Local: copia .env.example a .env, configura MySQL y SMTP, instala con npm ci e inicia con npm start.
- Docker: completa .env.docker a partir de .env.docker.example y ejecuta docker compose --env-file .env.docker up --build -d.
- Render: define las variables en Environment y despliega el servicio. El plan Free bloquea las conexiones salientes a 25, 465 y 587. Usa 2525 si tu proveedor admite STARTTLS en ese puerto o un servicio con salida SMTP habilitada. [Límites de Render](https://render.com/docs/free#other-limitations).
- Los archivos privados de entorno se excluyen de Git.

## Programas, progreso y certificado

Cada ejecución se evalúa también en el servidor y se guarda como intento. El alumno puede editar las líneas y repetir el recorrido con ayuda de las pistas. Se mantienen los avances anteriores y los identificadores de las seis expediciones.

Al completar las seis, el estudiante vuelve al Atlas y selecciona **Descargar certificado PDF**. Mientras queden misiones pendientes, el Atlas muestra sus nombres. El servidor consulta de nuevo las finalizaciones de su cuenta en MySQL. El PDF incluye su nombre y la fecha de la última misión completada, expresada en hora de Panamá.

## Archivos principales

| Ruta | Contenido |
| --- | --- |
| `Dockerfile` | Imagen usada para desplegar la aplicación |
| `render.yaml` | Configuración del servicio web de Render; no crea una base de datos |
| `database/schema.sql` | Tablas de usuarios, progreso, intentos, insignias y colaboración |
| `public/index.html` | Página de entrada |
| `src/server.js` | Servidor, autenticación y API |
| `src/database.js` | Conexión TLS a MySQL mediante variables de entorno |
| `public/expeditions.js` | Mapas y reglas de juego compartidos por el navegador y el servidor |
