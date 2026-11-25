# CraftLogic

CraftLogic es un software educativo en español para estudiantes de 10 a 15 años. Está desarrollado con JavaScript, Node.js, Express y MySQL.

- **Aplicación:** [craftlogic.onrender.com](https://craftlogic.onrender.com)
- **Estado de la base de datos:** [comprobar conexión MySQL](https://craftlogic.onrender.com/api/health)

## Funciones

- Registro e inicio de sesión para estudiantes y docentes.
- Seis expediciones por mundos de bloques para practicar rutas, secuencias, condiciones y gestión de recursos.
- Movimiento con flechas, WASD o botones táctiles. Cada misión propone una meta opcional de pasos para ganar 100 puntos.
- Seguimiento del progreso, intentos e insignias.
- Panel docente para asignar módulos y revisar el avance de estudiantes.
- Salas de colaboración con código y registro de actividad. No incluyen sincronización del juego en tiempo real.
- Interfaz adaptable, navegación por teclado y contraste claro u oscuro.

## Despliegue actual

La aplicación está desplegada como servicio Docker en Render. La base de datos MySQL está alojada en Aiven y se conecta mediante TLS. Los despliegues de Render se realizan manualmente.

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

Para habilitar el registro de docentes, configura la variable TEACHER_INVITE_CODE con un valor privado en el archivo local .env, en .env.docker para Docker o como variable privada en Render. Los archivos .env y .env.docker están excluidos de Git. .env.example solo muestra el nombre de la variable; nunca publiques el código real en el README ni en el repositorio. Después de cambiar la variable en Render, reinicia o vuelve a desplegar el servicio.

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
