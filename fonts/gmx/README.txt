La tipografía "GMX" es una fuente personalizada/de pago y no se puede
descargar automáticamente. Para que la versión login-gmx.html se vea
correctamente:

1. Copia los archivos de la fuente (.woff2 y/o .woff) que ya tienes
   con licencia dentro de esta carpeta (fonts/gmx/), usando estos
   nombres exactos (o ajusta las rutas en css/login-gmx.css):

   - GMX-Light.woff2 / GMX-Light.woff        (peso 300, citas/llamadas)
   - GMX-Regular.woff2 / GMX-Regular.woff    (peso 400, cuerpo de texto)
   - GMX-RegularItalic.woff2 / .woff         (peso 400 itálica)
   - GMX-Bold.woff2 / GMX-Bold.woff          (peso 700, subtítulos)
   - GMX-Black.woff2 / GMX-Black.woff        (peso 900, títulos)

2. Si no tienes formato .woff2, puedes convertir el .ttf/.otf que
   tengas con una herramienta como https://cloudconvert.com/ttf-to-woff2
   o con fonttools (pip install fonttools brotli).

Mientras no agregues los archivos, el navegador usará automáticamente
el respaldo definido en el CSS (Georgia, serif).
