# Imágenes del sitio

Acá están todas las imágenes de la página. Para cambiar una, subí un archivo nuevo con EXACTAMENTE el mismo nombre (en GitHub: **Add file → Upload files**) y esperá 1 o 2 minutos.

| Carpeta | Qué hay | Medidas y peso recomendados |
|---|---|---|
| `hero/` | Portada: foto real del cartel luminoso de Lorena, en dos tamaños (`lc-hero-1200.webp` y `lc-hero-640.webp`). | Cuadrada. 1200 px y 640 px de lado. Hasta 260 KB la grande. |
| `services/` | Una imagen por servicio: `soft-gel`, `capping-gel`, `esmaltado-semipermanente`, `reconstruccion-pies`, `esmaltado-pies`. | Proporción 4:5, unos 720 px de ancho o más. Hasta 170 KB. |
| `gallery/` | Las siete imágenes de la galería "Atmósfera · Inspiración" (`galeria-01` a `galeria-07`). | Proporción 4:5, unos 720 px de ancho o más. Hasta 170 KB. |
| `brand/` | Ícono de la pestaña, monograma LC e imagen que aparece al compartir el link (`lc-og.jpg`, 1200 × 630). | — |

**Importante:** las imágenes de `gallery/` y `services/` que vienen con la página son ilustraciones de ambiente generadas con IA. No son trabajos de Lorena. Por eso la galería se llama "Inspiración".

Las fotos que Lorena sube desde su panel (Ajustes → Galería / Servicios) NO pasan por esta carpeta: se guardan en la base de datos y reemplazan a estas en cuanto sube la primera.

Reglas para cualquier imagen nueva: formato WebP (o JPG/PNG), sin texto, logos, marcas de agua ni personas reconocibles, en tonos marfil y beige, con los dedos de manos y pies bien formados. El texto alternativo de cada imagen se edita en `index.html` (buscá `galeria:` y `fotosServicio:`).

La guía completa, con los pedidos listos para pegar en Gemini y los pasos de optimización, está en `docs/GUIA-IMAGENES.md` del paquete que armó Diego (no se sube a GitHub).
