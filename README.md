# 🚒 SCI Bomberos — Comando de Incidentes · **beta**

Tablero de comando para incendios, rescates y emergencias, pensado para cuarteles de bomberos de Argentina. En español, con la estructura del Sistema de Comando de Incidentes (SCI). Funciona en **computadora, tablet y celular**, se instala como app y **sigue funcionando sin señal**.

**[▶ Abrir la app](https://mauricioezequielroldan.github.io/SCI/)** · [Guía rápida](docs/GUIA_RAPIDA.md) · [Kit para administradores](docs/KIT_ADMIN.md) · [Nube para equipos en vivo](docs/NUBE.md) · [Términos](docs/TERMINOS.md) · [Privacidad](docs/PRIVACIDAD.md)

> 🧪 **Versión beta** en prueba con cuarteles. Es una herramienta de apoyo: no reemplaza la radio ni los procedimientos del cuartel. ¿Algo falla? [Reportá un problema](https://github.com/mauricioezequielroldan/SCI/issues/new).
>
> 🎬 Para verla sin cargar nada: en la pantalla inicial tocá **«Probar con datos de ejemplo»** (PIN `1234`).

![Vista general de una operación](docs/img/02-vista-general.png)

## Qué hace
| | |
|---|---|
| 🏠 **Cada cuartel con su espacio** | Personal con perfil y PIN, unidades con foto, historial. |
| 🧭 **Tablero de comando** | Sectores, recursos propios y de otras instituciones, PAR con alarma, rotación, estructura SCI. |
| 👥 **Equipos con QR** | El jefe de equipo escanea y, sin usuario ni PIN, envía recorrido GPS, reportes, fotos, PAR y MAYDAY; recibe tarea, viento, mensajes y evacuación. |
| 🫁 **ERA, 🆘 MAYDAY y 🚨 evacuación** | Avisos de aire, MAYDAY siempre visible y evacuación con confirmación por equipo. |
| ✏ **Croquis** | Sobre una captura del lugar, con norte y viento automáticos. |
| 📄 **Informe PDF** | Estilo SCI-201/207/211 con resumen para cargar en RUBA. |
| 🔒 **Privacidad** | Víctimas sin datos identificatorios (código V-01), consentimiento del personal, borrado automático. |

## Cómo empezar
1. Abrí **https://mauricioezequielroldan.github.io/SCI/** en cada celular o tablet e **instalala** (*Agregar a pantalla de inicio*).
2. Aceptá los términos, creá el cuartel y cargá personal y unidades.
3. Exportá el respaldo del cuartel (Ajustes) e importalo en los demás dispositivos.
4. (Opcional) Activá la [nube del cuartel](docs/NUBE.md) para ver a los equipos en vivo.

## Límites conocidos (beta)
- Los datos quedan en cada dispositivo. **En iPhone, instalala** en la pantalla de inicio: usada desde Safari, los datos pueden borrarse tras días sin uso.
- El PIN ordena quién opera; no es seguridad fuerte.
- El GPS del equipo se pausa si el celular se bloquea.
- El PDF es una ayuda: verificá los datos antes de cargarlos en RUBA.

## Licencia y responsabilidad
Código bajo licencia [MIT](LICENSE). El uso de la aplicación está sujeto a los [Términos y condiciones](docs/TERMINOS.md): es una herramienta de apoyo y su uso es responsabilidad del operador y del cuartel.
