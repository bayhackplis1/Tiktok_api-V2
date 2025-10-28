# TikTok Downloader API Documentation

## Endpoint de Búsqueda - Descarga de los 5 Videos Más Recientes

### GET `/api/tiktok/search/:username`

Este endpoint descarga y envía los **5 videos más recientes** de un usuario de TikTok en un archivo ZIP.

#### Características
- ✅ Método: **GET**
- ✅ Descarga: **5 videos más recientes del perfil**
- ✅ Respuesta: **Archivo ZIP con 5 videos MP4**
- ✅ Descarga directa sin JSON
- ✅ Un solo request para obtener múltiples videos

---

### Uso

#### URL
```
GET http://localhost:5000/api/tiktok/search/:username
```

#### Parámetros
- **username** (obligatorio): Nombre de usuario de TikTok (con o sin @)
  - Ejemplos: `tiktok`, `@tiktok`, `charlidamelio`, `@khaby.lame`

#### Ejemplos de URLs
```
GET /api/tiktok/search/@tiktok
GET /api/tiktok/search/tiktok
GET /api/tiktok/search/@charlidamelio
GET /api/tiktok/search/khaby.lame
```

---

### Comportamiento

1. **Busca** el perfil del usuario en TikTok
2. **Identifica** los 5 videos más recientes
3. **Descarga** todos en formato MP4
4. **Empaqueta** en un archivo ZIP
5. **Envía** el ZIP directamente al navegador/cliente

---

### Ejemplo de Uso con cURL

```bash
# Descargar los 5 videos más recientes de @tiktok
curl -O -J http://localhost:5000/api/tiktok/search/@tiktok

# Sin @
curl -O -J http://localhost:5000/api/tiktok/search/tiktok

# Otro usuario
curl -O -J http://localhost:5000/api/tiktok/search/@charlidamelio
```

**Resultado**: Se descarga un archivo llamado `tiktok-username-latest-5.zip` que contiene los 5 videos más recientes.

---

### Ejemplo con JavaScript (Frontend)

```javascript
// Descargar los 5 videos más recientes de un usuario
function downloadLatest5Videos(username) {
  const a = document.createElement('a');
  a.href = `/api/tiktok/search/${username}`;
  a.download = `${username}-latest-5.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Uso
downloadLatest5Videos('@tiktok');
```

---

### Ejemplo con HTML

```html
<!DOCTYPE html>
<html>
<head>
    <title>Descargar 5 Videos Más Recientes</title>
</head>
<body>
    <h1>Descargar 5 Videos Más Recientes de TikTok</h1>
    
    <input 
      type="text" 
      id="username" 
      placeholder="@username"
    >
    <button onclick="download()">Descargar ZIP</button>
    
    <script>
        function download() {
            const username = document.getElementById('username').value;
            window.location.href = `/api/tiktok/search/${username}`;
        }
    </script>
</body>
</html>
```

---

### Ejemplo con Python

```python
import requests

# Descargar los 5 videos más recientes de @tiktok
username = 'tiktok'
url = f'http://localhost:5000/api/tiktok/search/@{username}'

response = requests.get(url, stream=True)

# Guardar el archivo ZIP
filename = f'{username}-latest-5.zip'
with open(filename, 'wb') as f:
    for chunk in response.iter_content(chunk_size=8192):
        f.write(chunk)

print(f'✅ ZIP descargado: {filename}')
print(f'   Contiene los 5 videos más recientes de @{username}')
```

---

### Contenido del ZIP

El archivo ZIP descargado contiene:

```
tiktok-username-latest-5.zip
├── video-00001.mp4  (Video más reciente)
├── video-00002.mp4  (Segundo más reciente)
├── video-00003.mp4  (Tercero más reciente)
├── video-00004.mp4  (Cuarto más reciente)
└── video-00005.mp4  (Quinto más reciente)
```

**Nota**: Si el usuario tiene menos de 5 videos, el ZIP contendrá solo los videos disponibles.

---

### Formato de Respuesta

**Content-Type**: `application/zip`  
**Content-Disposition**: `attachment; filename="tiktok-username-latest-5.zip"`

El servidor envía el archivo ZIP directamente. El navegador iniciará la descarga automáticamente.

---

### Validación y Seguridad

- ✅ Solo acepta caracteres alfanuméricos, guiones, puntos y guiones bajos en usernames
- ✅ Usa `spawn()` en lugar de `exec()` para prevenir inyección de comandos
- ✅ Valida el username con regex: `/^[a-zA-Z0-9._-]+$/`
- ✅ Descarga en carpeta temporal `.temp`
- ✅ Compresión ZIP con nivel 9 (máxima compresión)

---

### Códigos de Estado HTTP

- **200 OK**: Videos descargados y ZIP enviado correctamente
- **400 Bad Request**: Username inválido
- **500 Internal Server Error**: Error al descargar (usuario no existe, sin videos, etc.)

---

### Diferencias con `/api/tiktok/download/video`

| Característica | `/search/:username` | `/download/video?url=...` |
|---------------|---------------------|---------------------------|
| Parámetro | Username | URL completa del video |
| Videos | Los 5 más recientes | El específico de la URL |
| Formato | ZIP con múltiples MP4 | Un solo MP4 |
| Uso | Perfil → 5 primeros videos | URL → ese video exacto |

---

## Notas Importantes

1. **Descarga 5 videos**: Si el usuario tiene menos de 5 videos, descargará solo los disponibles
2. **Tiempo de descarga**: ~30-90 segundos dependiendo del tamaño total
3. **Usuarios privados**: Puede no funcionar con perfiles privados
4. **Tamaño del ZIP**: Típicamente 20-100 MB dependiendo de la duración de los videos
5. **Limitaciones de TikTok**: Depende de la disponibilidad de yt-dlp

---

## Troubleshooting

### Error "Usuario inválido"
- Verifica que el username solo contenga caracteres permitidos
- No uses espacios, emojis o caracteres especiales

### El ZIP está vacío o tiene menos de 5 videos
- El usuario puede tener menos de 5 videos públicos
- Algunos videos pueden ser privados o eliminados
- Revisa los logs del servidor para más detalles

### La descarga tarda mucho
- 5 videos grandes pueden tardar hasta 2 minutos
- La velocidad depende de la conexión a TikTok
- La compresión del ZIP también toma tiempo
- Espera pacientemente

### El ZIP no se puede abrir
- Asegúrate de que la descarga se completó (revisa el tamaño del archivo)
- Intenta con otro programa de descompresión
- Si el problema persiste, revisa los logs del servidor

---

## Casos de Uso

### 1. Backup de contenido reciente
```bash
# Descargar y respaldar los últimos 5 videos de tu creador favorito
curl -O -J http://localhost:5000/api/tiktok/search/@your-favorite-creator
```

### 2. Análisis de contenido
```python
# Script para descargar y analizar los últimos videos de múltiples usuarios
import requests
import zipfile
import os

users = ['tiktok', 'charlidamelio', 'khaby.lame']

for user in users:
    print(f'Descargando de @{user}...')
    
    # Descargar ZIP
    response = requests.get(f'http://localhost:5000/api/tiktok/search/@{user}')
    zip_file = f'{user}-latest-5.zip'
    
    with open(zip_file, 'wb') as f:
        f.write(response.content)
    
    # Extraer videos
    with zipfile.ZipFile(zip_file, 'r') as zip_ref:
        zip_ref.extractall(f'videos/{user}')
    
    print(f'✅ {user}: Videos extraídos en videos/{user}/')
```

### 3. Interfaz web simple
```html
<a href="/api/tiktok/search/@tiktok" download>
  Descargar últimos 5 videos de @tiktok (ZIP)
</a>
```

### 4. Monitoreo automático
```javascript
// Descargar automáticamente los últimos videos cada semana
const users = ['tiktok', 'charlidamelio'];

users.forEach(user => {
  fetch(`/api/tiktok/search/@${user}`)
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${user}-backup.zip`;
      a.click();
    });
});
```

---

## Ventajas de este Endpoint

✅ **Un solo request**: Obtén 5 videos con una llamada  
✅ **Descarga directa**: Sin pasos intermedios  
✅ **Formato estándar**: ZIP compatible con todos los sistemas  
✅ **Eficiente**: Compresión nivel 9 para archivos más pequeños  
✅ **Automático**: No necesitas procesar JSON ni hacer múltiples requests  

---

¿Necesitas ayuda? Revisa los logs del servidor o contacta soporte.
