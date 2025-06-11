# SafePayBlockchain

## Estructura del Proyecto

Este proyecto es una API backend en Flask para la gestión de usuarios, cuentas, transacciones y solicitudes de pago, usando SQLAlchemy y migraciones con Flask-Migrate.

### Archivos y carpetas principales

- **app/**  
  Carpeta principal de la aplicación Flask.
  - **\_\_init\_\_.py**  
    Inicializa la app Flask, la base de datos y las migraciones. Aquí se importa la configuración y los modelos.
  - **config.py**  
    Configuración de la aplicación, incluyendo la cadena de conexión a la base de datos.  
    **No debe subirse al repositorio si contiene datos sensibles.**
  - **models.py**  
    Define los modelos de la base de datos: Usuario, Cuenta, Transaccion, SolicitudPago, Dispositivo.
  - **routes.py**  
    Aquí deben ir las rutas/endpoints de la API (actualmente puede estar vacío o pendiente de implementación).

- **migrations/**  
  Carpeta generada automáticamente por Flask-Migrate. Contiene el historial de migraciones de la base de datos.  
  **No es necesario subirla al repositorio si se puede regenerar.**

- **app.py**  
  Archivo principal para ejecutar la aplicación Flask. Crea la app y verifica la conexión a la base de datos.

- **.gitignore**  
  Lista de archivos y carpetas que git debe ignorar (por ejemplo, archivos de configuración sensibles, cachés, bases de datos locales, migraciones, etc.).

- **README.md**  
  Este archivo. Explica la estructura y propósito del proyecto.

---

## ¿Qué debe ir en cada archivo?

- **config.py:**  
  Solo la configuración (variables de entorno, cadena de conexión). No debe contener lógica de la app.

- **models.py:**  
  Solo definiciones de modelos de SQLAlchemy (clases que representan tablas).

- **routes.py:**  
  Solo las rutas/endpoints de la API Flask.

- **\_\_init\_\_.py:**  
  Inicialización de la app, base de datos y migraciones. Importa los modelos para que Flask-Migrate los detecte.

- **app.py:**  
  Punto de entrada de la aplicación. Crea la app y puede incluir pruebas de conexión.

---

## Notas

- No subas datos sensibles (contraseñas, cadenas de conexión reales) al repositorio.
- Usa variables de entorno para la configuración en producción.
- Si cambias los modelos, recuerda ejecutar las migraciones (`flask db migrate` y `flask db upgrade`).
