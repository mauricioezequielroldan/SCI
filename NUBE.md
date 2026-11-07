# Nube del cuartel (equipos con QR en vivo y registro de consentimientos)

## Para el administrador del cuartel (1 minuto)
1. Recibís un **código de conexión** (empieza con `SCI1.`) o un **QR**.
2. Con el QR: abrilo con la cámara del celular → entrá con tu usuario administrador → **Conectar**.
   Con el código: *Ajustes → «Tengo un código de conexión»* → pegalo → **Conectar**.
3. Exportá de nuevo el respaldo del cuartel e importalo en los otros dispositivos.

## Para quien administra la nube (una vez por cuartel, ~10 minutos, desde una computadora)
Usá una **cuenta de Google exclusiva del proyecto** (por ejemplo `sci.bomberos.beta@gmail.com`), no la del trabajo.
1. En la app: *Ajustes → «Crear una nube nueva» → Abrir el asistente*.
2. **Paso 1:** correo que recibe los informes. Marcá si la nube la administra el proyecto durante la beta.
3. **Paso 2:** «Copiar el código del script» (ya trae la clave y el correo).
4. **Paso 3:** en script.google.com → nuevo proyecto → pegar → *Implementar → Nueva implementación → Aplicación web* →
   Ejecutar como **Yo** · Acceso **Cualquier persona** → autorizar («Configuración avanzada → Ir a… → Permitir»).
5. **Paso 4:** pegar la URL `/exec` → **Probar** → «Conectar ESTE cuartel» o «Código para otro cuartel» (QR, código y WhatsApp).

Hacé **un script por cuartel**: así cada uno tiene su clave y sus datos separados.

## Qué queda en la cuenta de Google
Carpeta **«SCI Bomberos»** en Drive:
- **Consentimientos** (planilla): una fila por cada aceptación de términos, aviso de privacidad, dato de salud, anexo de la beta y términos de los equipos por QR, con fecha, cuartel, integrante, legajo, versión y dispositivo. No se duplica.
- Copias de las operaciones, eventos de los equipos, fotos e informes PDF.

## Si actualizás el código
Si ya tenías una nube creada antes de la v2.5: copiá el código nuevo (asistente, paso 2, con la **misma clave**: está en *Ajustes → Configuración manual*) y en Google *Implementar → Administrar implementaciones → ✎ → Versión: Nueva versión*. Va a pedir permiso para **Hojas de cálculo** (por la planilla de consentimientos).

## Cuidados
- El código de conexión da acceso a los datos del cuartel: mandalo solo al administrador, por un canal privado.
- Los QR de equipo no llevan la clave: solo permiten enviar datos de ese equipo a esa operación.
