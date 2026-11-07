# Alarma del cuartel (beta)

> ⚠ Es un **complemento** de la sirena, la radio y otros sistemas. Puede demorarse o no llegar. Nunca debe ser el único aviso.

## Cómo funciona
- La alarma sale por **ntfy**, una app gratuita de alertas (Android y iPhone). En **Android** puede sonar fuerte aunque el celular esté en «No molestar».
- Opcional: también sale por un **grupo de Telegram** mediante un «bot» (usuario automático). Sirve de respaldo y deja registro escrito.

## Administrador (una vez)
1. *Ajustes → 🚨 Alarma del cuartel → Activar alarma*.
2. *📱 QR para adherirse*: imprimilo o mandalo por WhatsApp al personal.
3. Revisá *👥 Adhesiones* y aprobá (las solicitudes quedan disponibles 12 horas).
4. *🧪 Probar alarma* con todos los celulares en silencio.

### Telegram (opcional)
1. Creá un grupo del cuartel en Telegram.
2. Hablale a **@BotFather** → `/newbot` → nombre → usuario terminado en `bot` → copiá el **token**.
3. Agregá el bot al grupo y escribí `/start` en el grupo.
4. En *Ajustes → Telegram*: pegá el token → **Detectar grupo**. (Opcional: pegá el enlace de invitación para que aparezca al adherirse.)

## Bombero (1 minuto)
1. Escaneá el QR → nombre → aceptá → **Adherirme**.
2. Instalá **ntfy** → **Suscribirme**.
3. Android: en ntfy → canal → ⋮ → notificaciones → prioridad máxima → **Anular «No molestar»** y sonido fuerte. Ajustes → Batería → ntfy → **Sin restricciones**.

## Disparar
*Inicio → 🚨 DISPARAR ALARMA* (administrador o habilitados para comando): tipo, dirección, ubicación y mensaje. Después podés abrir la operación con esos datos.

## Límites
- En **iPhone** no rompe el modo silencio.
- Quien tiene el QR (o el nombre del canal) recibe las alarmas y podría enviar avisos falsos: no lo publiques. Si se filtra o alguien deja el cuartel: *Avanzado → Cambiar canal* y que todos vuelvan a escanear.
- Rechazar una adhesión no corta la alarma a esa persona; cambiar el canal sí.
- Usa el servidor público gratuito de ntfy (ntfy.sh).
