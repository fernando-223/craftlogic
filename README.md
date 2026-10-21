# CraftLogic

CraftLogic es un prototipo funcional de software educativo en español para estudiantes de 10 a 15 años. Está desarrollado con JavaScript, Node.js, Express y MySQL. La interfaz está inspirada en el HTML proporcionado y conserva su paleta verde/azul, los bloques de programación y la aventura de la llave y la puerta.

## Qué incluye

- Registro e inicio de sesión para estudiantes y docentes.
- Siete misiones: pensamiento computacional, secuencias, condicionales, bucles, variables y eventos, proyecto final y evaluación.
- Editor sencillo de bloques con acciones para añadir, ordenar y quitar bloques.
- Evaluación automática, retroalimentación y puntuación.
- Progreso, intentos e insignias guardados en MySQL.
- Panel docente, asignación de módulos por correo y resumen del avance de los estudiantes asignados.
- Salas de colaboración con código compartible y actividad/mensajes guardados.
- Diseño adaptable, contraste claro/oscuro y navegación por teclado.
- Invitación privada para crear cuentas docentes.

El modo colaborativo ofrece salas y registro compartido de actividad; no implementa sincronización en tiempo real del mundo del juego.

## Publicar gratis con Render y Aiven

Render aloja la aplicación web en el plan gratuito. `render.yaml` ya no crea una base MySQL de pago: espera que la aplicación se conecte a un servidor MySQL externo. La opción elegida para este proyecto es el plan gratuito de [Aiven for MySQL](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier), que ofrece 1 GB de almacenamiento y no requiere tarjeta. Aiven puede apagar servicios gratuitos que permanezcan inactivos; úsalo para el prototipo y revisa sus límites antes de guardar datos reales de estudiantes. La web gratuita de Render también puede tardar en despertar tras un periodo sin visitas.

### Crear y conectar MySQL

1. En Aiven, crea un servicio **MySQL Free** y una base de datos llamada `craftlogic`. Crea un usuario para la aplicación con acceso a esa base.
2. Desde Aiven, guarda el host, puerto, usuario y contraseña de conexión y descarga el certificado CA del servicio. No compartas la contraseña ni subas el certificado a GitHub.
3. En Render, abre el servicio web existente `craftlogic` y entra en **Environment**. Configura `DB_HOST`, `DB_PORT`, `DB_NAME` (`craftlogic`), `DB_USER`, `DB_PASSWORD` y `DB_SSL_CA`. En `DB_SSL_CA`, pega el contenido completo del certificado CA.
4. Aplica `database/schema.sql` a la base `craftlogic` usando el cliente MySQL con la conexión SSL de Aiven. `database/native-setup.sql` es solo para una instalación local y no debe ejecutarse en Aiven.
5. Guarda las variables y espera el redeploy. Comprueba `https://craftlogic.onrender.com/api/health`; debe indicar que la base está conectada.

No pulses **Deploy Blueprint** para crear MySQL en Render: el servicio privado y su disco tienen costo. Mantén las contraseñas en las variables de Render, nunca en el repositorio. Para crear cuentas de docentes, configura `TEACHER_INVITE_CODE` como secreto en el servicio web y compártelo en privado.

## Encontré MySQL instalado

En este equipo, el servicio instalado se llama `MySQL267`. El servidor y el cliente están en:

```text
C:\Users\fperez\Downloads\mysql-enterprise-26.7.0_winx64_bundle\mysql-commercial-26.7.0-winx64\mysql-commercial-26.7.0-winx64\bin\mysqld.exe
C:\Users\fperez\Downloads\mysql-enterprise-26.7.0_winx64_bundle\mysql-commercial-26.7.0-winx64\mysql-commercial-26.7.0-winx64\bin\mysql.exe
```

El archivo de configuración del servidor está en `C:\ProgramData\MySQL\MySQL Server 26.7\my.ini` y los datos están en `C:\ProgramData\MySQL\MySQL Server 26.7\Data`. La configuración usa el puerto `3306`. No pude consultar el estado del servicio porque Windows devolvió “Acceso denegado” al consultar el Service Control Manager; si MySQL no inicia, abre PowerShell como administrador y ejecuta `Start-Service MySQL267`.

## Ejecutar con Docker (recomendado)

Requiere Docker Desktop con Docker Compose. Este modo ejecuta su propio MySQL aislado y no usa el servicio MySQL267 instalado en Windows.

1. Copia la plantilla de variables y cambia los tres valores de ejemplo por claves propias:

   ```powershell
   Copy-Item .env.docker.example .env.docker
   notepad .env.docker
   ```

   `SESSION_SECRET` debe ser una frase aleatoria larga. `DB_PASSWORD` y `MYSQL_ROOT_PASSWORD` deben ser distintas.

2. Desde la carpeta del proyecto, construye e inicia la aplicación y MySQL:

   ```powershell
   docker compose --env-file .env.docker up --build -d
   ```

3. Abre [http://localhost:3000](http://localhost:3000). Si cambiaste `APP_PORT`, usa ese puerto. Revisa los contenedores con `docker compose --env-file .env.docker ps` y los registros con `docker compose --env-file .env.docker logs -f app db`.

El esquema de `database/schema.sql` se aplica automáticamente al crear la base por primera vez. MySQL guarda los datos en el volumen `mysql_data`: `docker compose --env-file .env.docker down` detiene los contenedores sin borrar el progreso. Para borrar también la base y todos los datos, usa `docker compose --env-file .env.docker down -v`.

## Ejecutar sin Docker

Requiere Node.js 20 o posterior, npm y MySQL Server instalado y en ejecución.

### Preparar la base de datos

Desde PowerShell, en la carpeta del proyecto, ejecuta el cliente MySQL con una cuenta administradora. Te pedirá la contraseña de `root`:

```powershell
$mysql = 'C:\Users\fperez\Downloads\mysql-enterprise-26.7.0_winx64_bundle\mysql-commercial-26.7.0-winx64\mysql-commercial-26.7.0-winx64\bin\mysql.exe'
& $mysql -u root -p -e "source C:/Users/fperez/Desktop/Craftlogic/database/native-setup.sql"
& $mysql -u root -p -e "source C:/Users/fperez/Desktop/Craftlogic/database/schema.sql"
```

Antes de ejecutar el paso anterior, cambia `cambia-la-clave` en `database/native-setup.sql` por una contraseña propia. Utiliza esa misma contraseña en `.env`. `schema.sql` contiene las tablas; `native-setup.sql` prepara la base y el usuario local.

### Iniciar la aplicación

```powershell
Copy-Item .env.example .env
```

Edita `.env`: pon la contraseña de MySQL configurada en el esquema y cambia `SESSION_SECRET` por una frase aleatoria larga. Luego:

```powershell
npm install
npm start
```

Abre [http://localhost:3000](http://localhost:3000). Crea una cuenta desde la pantalla inicial; no hay cuentas de demostración ni contraseñas predefinidas. El estado de MySQL puede consultarse en [http://localhost:3000/api/health](http://localhost:3000/api/health).

Para usar el modo de contraste oscuro, pulsa el botón de contraste en la barra superior. En producción, configura HTTPS y `COOKIE_SECURE=true`.

## Estructura

```text
database/schema.sql  Tablas de MySQL
database/native-setup.sql  Base y usuario para instalación local de MySQL
render.yaml  Servicios para publicar la aplicación y MySQL en Render
public/index.html    Interfaz web y cliente JavaScript
src/content.js       Contenido, reglas y soluciones de las misiones
src/database.js      Conexión a MySQL
src/server.js        Servidor, autenticación y API
```
