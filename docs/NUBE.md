# Nube del cuartel (equipos con QR en vivo, respaldo y seguir en vivo)

La app funciona sin nube. La nube agrega:
- **Equipos con QR en vivo:** recorrido, reportes, fotos, PAR y MAYDAY llegan al comando en segundos; el equipo recibe tarea, viento, mensajes y evacuación.
- **Respaldo automático** de la operación en el Google Drive del cuartel.
- **Seguir en vivo** desde otro dispositivo (jefe de cuartel, central).
- **Correo con el PDF** al cerrar la operación.

Usa un script gratuito en la **cuenta de Google del cuartel**. Los datos quedan en ese Drive, no en servidores de terceros.

## Instalación (una vez, ~5 minutos)
1. Entrá a <https://script.google.com> con la cuenta del cuartel → **Nuevo proyecto**.
2. Borrá el contenido y pegá **todo** [`apps-script/Code.gs`](../apps-script/Code.gs).
3. Cambiá arriba:
   - `TOKEN`: una clave larga inventada (ej. 30 letras y números).
   - `EMAIL_TO`: correo(s) donde llegan los informes.
4. **Implementar → Nueva implementación → ⚙ Aplicación web**
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier persona**
5. Autorizá los permisos (Drive y Gmail). Copiá la **URL de la aplicación web** (termina en `/exec`).
6. En la app: **Ajustes del cuartel → Nube** → pegá URL y clave → **Probar conexión** → **Guardar**.
7. Exportá de nuevo el respaldo del cuartel e importalo en los otros dispositivos (así todos tienen la configuración).

## Cómo se usa en una operación
1. En **👥 Equipos → Nuevo equipo**: nombre, sector, tarea e integrantes → **QR**.
2. El jefe de equipo escanea el QR con la **cámara** del celular y toca el enlace.
3. Acepta compartir la ubicación y toca **📍 Compartir mi recorrido**.
4. El comando ve el mapa y los reportes (se actualiza cada 15 s; botón 🔄 para forzar).

## Límites y cuidados
- Con la **URL + TOKEN** se puede leer y escribir todo: compartilos solo con dispositivos del cuartel. El respaldo `.json` del cuartel incluye esa clave.
- Los **QR de equipo no llevan el TOKEN**: solo permiten a ese equipo enviar datos a esa operación. Si se pierde un celular, renová el QR (✎ en el equipo).
- **GPS en segundo plano:** los navegadores pausan el GPS si el celular se bloquea o la app queda atrás. Al equipo se le indica mantener la pantalla encendida (la app la mantiene activa mientras comparte).
- Google limita la cantidad de ejecuciones diarias de scripts gratuitos; para un cuartel con algunos equipos en simultáneo alcanza, pero **probalo en un simulacro** antes de depender de esto.
- Si cambiás `Code.gs`: *Implementar → Administrar implementaciones → ✎ → Nueva versión* (la URL no cambia).
