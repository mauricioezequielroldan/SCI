# Publicar la app en GitHub (paso a paso)

No hace falta saber programar. Lleva unos 10 minutos.

## 1. Crear el repositorio
1. Entrá a <https://github.com> e iniciá sesión (o creá una cuenta gratuita).
2. Arriba a la derecha: **＋ → New repository**.
3. Nombre: `sci-bomberos`. Visibilidad: **Public** (GitHub Pages gratis requiere repositorio público).
4. **Create repository**.

## 2. Subir los archivos
1. En el repositorio nuevo: **uploading an existing file** (o **Add file → Upload files**).
2. Descomprimí el zip y **arrastrá todo el contenido de la carpeta** `sci-bomberos` (no la carpeta en sí): `index.html`, `css/`, `js/`, `icons/`, `docs/`, `apps-script/`, `.github/`, `README.md`, etc.
   - Si el navegador no sube la carpeta oculta `.github`, no pasa nada: usá la opción B del paso 3.
3. Abajo: **Commit changes**.

## 3. Activar GitHub Pages
- **Opción A (automática):** *Settings → Pages → Build and deployment → Source: **GitHub Actions***. Cada vez que subas cambios, se publica sola (ver pestaña *Actions*).
- **Opción B (simple):** *Settings → Pages → Source: **Deploy from a branch** → Branch: `main` / `(root)` → Save*.

A los 1-2 minutos aparece la dirección, por ejemplo:
`https://TU-USUARIO.github.io/sci-bomberos/`

## 4. Instalar en los dispositivos
- **Android (Chrome):** abrí la dirección → menú ⋮ → **Instalar aplicación** / *Agregar a pantalla principal*.
- **iPhone/iPad (Safari):** abrí la dirección → **Compartir** → **Agregar a inicio**.
- **Computadora (Chrome/Edge):** ícono de instalar en la barra de direcciones.

Después de abrirla una vez, funciona **sin señal**.

## 5. Cargar el cuartel en todos los equipos
En el dispositivo donde creaste el cuartel: *Ajustes → Exportar respaldo (.json)*. En cada dispositivo nuevo: pantalla inicial → *Importar respaldo*. (Repetilo cuando agregues personal o unidades.)

## 6. (Opcional) Nube para equipos en vivo
Ver [NUBE.md](NUBE.md).

## Actualizar a una versión nueva
Subí los archivos nuevos (reemplazando) y cambiá `VERSION` en `sw.js` para que los dispositivos tomen la actualización. Los datos guardados en cada dispositivo no se pierden.

## ¿Y descargarla sin GitHub Pages?
Se puede bajar el zip (*Code → Download ZIP*) y abrir `index.html`, pero **en modo archivo local el GPS y los QR de equipo no funcionan** (necesitan una dirección `https`). Para uso real, publicala.
