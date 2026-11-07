# Cambios

## 2.8.0
- **En vivo sin configurar nada:** los equipos por QR transmiten a la nube del proyecto. Ya no hace falta crear el script de Google ni copiar códigos.
- **📲 Sumar operador:** un QR para que una segunda tablet **opere** o **solo mire** en vivo. Los cambios de los dos se combinan (gana el más reciente; la bitácora se une; lo borrado queda borrado). Muestra quién más está conectado.
- **Cifrado de punta a punta** (AES-256) con la clave del QR: en la nube no se puede leer nada.
- **Limpieza automática:** al minuto de cerrar, se borran de la nube recorridos y copias.
- Una sola conexión por dispositivo y solo con una operación abierta.
- El respaldo en Google Drive pasa a ser **opcional** (Ajustes → plegado).

## 2.7.0
- **Personal en vivo por Telegram:** cada bombero comparte su ubicación en tiempo real con el bot del cuartel y aparece en el mapa del comando (👤), **aunque tenga el celular bloqueado**. Sin QR ni conexión a la nube por persona.
- **Alarma con «🚒 Voy / ❌ No puedo»:** panel en Inicio con quién viene, quién no y quién no respondió, más un mapa de los que vienen. El mensaje del grupo se actualiza solo con el conteo.
- **Dos operadores:** con la nube v2.7, la nube lee a Telegram y reparte a todas las tablets del comando.
- *Vincular personas*: asocia cada cuenta de Telegram con su ficha del personal.
- El QR de adhesión incluye el acceso al bot.
- **Requiere actualizar el script de Google a la v2.7** (pide un permiso nuevo para conectarse con Telegram).

## 2.0.0
- **Equipos con QR:** cada equipo de trabajo recibe un QR. El jefe de equipo lo escanea con la cámara y, sin usuario ni PIN, envía su **recorrido GPS**, reportes rápidos, texto o dictado, **fotos**, **PAR** y **MAYDAY**. Recibe la tarea, el viento, mensajes del comando y la **orden de evacuación** (pantalla roja con sonido y confirmación).
- **Mapa de recorridos** de todos los equipos (OpenStreetMap si hay internet; grilla sin conexión) y recorrido dibujado en el PDF.
- **Control de ingreso con ERA** por equipo, con aviso a los 5 minutos y al cumplirse el tiempo.
- **Orden de evacuación** con conteo de confirmaciones por equipo.
- **Seguir en vivo** (solo lectura) desde otro dispositivo: jefe de cuartel, central.
- **Modo registro** sin nube: el equipo guarda todo y lo envía como archivo; el comando lo importa.
- Diseño renovado: **guía de primeros pasos**, botón **＋ de acción rápida**, **barra inferior en celular**, **dictado por voz**, pantalla de inicio explicativa, **modo de ejemplo** para presentar.
- PDF con sección de equipos, recorridos, reportes del terreno y fotos.
- Sin pasos de compilación: se publica tal cual en GitHub Pages.

## 1.3.0
Traspaso de comando, respaldo en la nube, croquis con imagen y viento, fotos de unidades, otras instituciones.

## 1.2.0
Vista general, ubicación robusta, compartir situación.

## 1.1.0
Hitos tácticos, croquis, registro de víctimas (SCI-207), PDF tipo SCI-201/207/211 y resumen para RUBA.

## 1.0.0
Cuarteles, personal, unidades, tablero de comando, MAYDAY, cierre con PDF.

## 2.6.1
- **Corrección:** si el comando estuvo un rato sin conexión y se juntaban más de 300 novedades de los equipos, se salteaba el resto (posiciones y reportes perdidos). Ahora las trae todas, de a tandas.
- **Corrección (requiere actualizar el script de Google):** con dos dispositivos de comando, el que tenía datos viejos podía **levantar sin querer la orden de evacuación** o borrar mensajes que había enviado el otro. Ahora la nube conserva la orden más reciente y une los mensajes.
