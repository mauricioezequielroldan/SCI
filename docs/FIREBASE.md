# Nube del proyecto (para quien mantiene la app)

La app usa **un solo proyecto de Firebase** para todos los cuarteles (Realtime Database por REST, sin librerías). Los cuarteles no configuran nada.

- Configuración: `js/fb.js` (`FB_CFG`). No es secreta: la protegen las reglas y el cifrado.
- Plan **Spark** (gratuito, sin tarjeta): si se supera el límite, deja de aceptar conexiones; no cobra.
- Acceso **anónimo** habilitado en Authentication.

## Reglas (Realtime Database → Reglas)
```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "v1": {
      "ops": {
        "$op": {
          ".read": "auth != null",
          ".write": "auth != null",
          ".validate": "$op.length >= 20"
        }
      }
    }
  }
}
```

## Estructura
`/v1/ops/{canal}` (24 caracteres al azar por operación): `brief` (lo que ven los equipos), `ev/{equipo}/{id}` (posiciones y reportes), `board/{dispositivo}` (copia de cada operador), `pres/{dispositivo}` (quién está conectado). Todo cifrado con AES-GCM 256; la clave viaja solo en los QR.

## Si crece
Más de ~10 siniestros simultáneos → pasar a plan **Blaze** (pago por uso; con este volumen, centavos o pocos dólares al mes). Configurar una alerta de presupuesto en Google Cloud.
