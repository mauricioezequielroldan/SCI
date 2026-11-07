# Personal en vivo y «Voy / No puedo» por Telegram (v2.7)

> Complemento de la radio. La ubicación puede llegar con demora o no llegar si no hay señal de datos.

## Qué hace
- La alarma de Telegram llega con dos botones: **🚒 Voy** y **❌ No puedo**.
- En **Inicio** aparece el panel *Respuesta a la alarma*: cuántos vienen, cuántos no y quién no respondió, con un mapa de los que vienen.
- Cada bombero comparte su **ubicación en tiempo real** con el bot. Sigue funcionando **con el celular bloqueado** (Telegram es una app nativa).
- En la operación, el personal aparece en el mapa (👤 naranja) junto a los equipos, y en *Equipos → Personal en vivo*.
- El mensaje de la alarma en el grupo se actualiza solo con el conteo.

## Administrador (una vez, 10 minutos)
1. Tener la **alarma** y el **bot de Telegram** configurados (ver [ALARMA.md](ALARMA.md)).
2. **Recomendado:** tener la [nube](NUBE.md) conectada y actualizada a la **v2.7**. Así lo ven **todas las tablets del comando** (dos operadores). Al actualizar el script, Google pide permiso para «conectarse a un servicio externo»: es para hablar con Telegram.
3. *Ajustes → Alarma → Telegram → 🛰 Personal en vivo → **Activar***.
4. Volvé a imprimir o mandar el **QR de adhesión**: ahora incluye el botón para abrir el bot.
5. Hacé una **alarma de prueba**. Cuando el personal toque los botones, entrá a *🔗 Vincular personas* y asociá cada cuenta de Telegram con su ficha.

> Sin nube también funciona, pero **solo en un dispositivo**: Telegram entrega cada novedad una sola vez.

## Bombero (1 minuto)
1. Abrí el enlace del bot (está en el QR de adhesión) y tocá **Iniciar**.
2. Cuando llegue la alarma: tocá **🚒 Voy** o **❌ No puedo**.
3. Si vas: en el chat con el bot → **📎 → Ubicación → Compartir ubicación en tiempo real → 8 horas**.
4. Al terminar: **Dejar de compartir**.

## Privacidad
- La ubicación la ve solo el comando, y solo mientras la persona la comparte.
- Los recorridos personales se guardan en cada tablet **24 horas** y no van en el respaldo del cuartel.

## Límites
- Necesita señal de datos. Sin señal, Telegram la envía al volver.
- La demora típica es de 10 a 20 segundos.
- Si alguien que no es del cuartel le escribe al bot, aparece como «sin vincular» (en gris).
- Desactivar la «privacidad» del bot o hacerlo administrador del grupo solo hace falta si quieren compartir la ubicación **en el grupo** en vez del chat privado.
