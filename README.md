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

## Publicar en internet con GitHub y Render

El archivo `render.yaml` prepara dos servicios: la aplicación web gratuita y un MySQL privado con disco persistente. La base de datos no tendrá una dirección pública; Render conecta la aplicación usando su red privada. El servicio de MySQL necesita un plan de pago porque guarda datos en un disco persistente. La web gratuita puede tardar cerca de un minuto en despertar después de 15 minutos sin visitas. Revisa el plan y el costo que Render muestra antes de confirmar la creación.

1. Crea un repositorio **privado** nuevo en GitHub. No subas `.env`, `.env.docker` ni contraseñas.
2. Desde PowerShell, abre la carpeta del proyecto y conecta el repositorio. Reemplaza la dirección por la URL HTTPS que GitHub te muestre:

   ```powershell
   git add .
   git commit -m "Preparar CraftLogic para publicación"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
   git push -u origin main
   ```

3. En Render, elige crear un **Blueprint** y conecta ese repositorio de GitHub. Render leerá `render.yaml`; revisa los servicios y el costo, y confirma la creación.
4. Cuando ambos servicios aparezcan como disponibles, abre la dirección pública de `craftlogic-app`. Render genera HTTPS automáticamente.
5. Para registrar un docente, copia el valor de `TEACHER_INVITE_CODE` desde las variables del servicio `craftlogic-app` y compártelo en privado. No lo publiques en GitHub ni en la web.

El Blueprint genera automáticamente las contraseñas de la base de datos y la clave de sesión. No pongas secretos en `render.yaml`. El disco de MySQL conserva los datos durante reinicios y publicaciones; aun así, prepara respaldos de base de datos antes de usar información real. Render recomienda respaldos con `mysqldump` y no restaurar una base de datos desde una instantánea del disco.

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
