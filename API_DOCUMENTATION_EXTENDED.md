# TikTok Downloader API - Documentación Completa de Endpoints

## 🚀 Índice de Endpoints

1. [GET /api/tiktok/search/:username](#1-búsqueda-por-usuario) - Descarga 5 videos más recientes de un usuario
2. [GET /api/tiktok/hashtag/:tag](#2-búsqueda-por-hashtag) - Descarga 10 videos de un hashtag
3. [POST /api/tiktok/batch](#3-descarga-múltiple) - Descarga múltiples URLs en un ZIP
4. [GET /api/tiktok/user/:username/stats](#4-estadísticas-de-usuario) - Obtener stats del perfil
5. [POST /api/tiktok/metadata/batch](#5-metadata-en-lote) - Extraer info de múltiples URLs

---

## 1. Búsqueda por Usuario

### **GET /api/tiktok/search/:username**

Descarga los **5 videos más recientes** de un usuario.

#### Ejemplo
```bash
curl -O -J http://localhost:5000/api/tiktok/search/@tiktok
```

#### Respuesta
- **Formato**: ZIP
- **Nombre archivo**: `tiktok-username-latest-5.zip`
- **Contenido**: 5 videos MP4

---

## 2. Búsqueda por Hashtag

### **GET /api/tiktok/hashtag/:tag**

⚠️ **FUNCIONALIDAD NO DISPONIBLE**

Este endpoint **NO está operativo** debido a limitaciones de TikTok.

#### ¿Por qué no funciona?

TikTok bloqueó la extracción automatizada de videos por hashtag en 2021. Las herramientas como `yt-dlp` no pueden acceder a las páginas de hashtag debido a las restricciones de anti-bot de TikTok.

#### Respuesta del Endpoint
```json
{
  "message": "La búsqueda y descarga por hashtag no está disponible actualmente",
  "reason": "TikTok bloqueó esta funcionalidad en su plataforma y no puede ser extraída mediante herramientas automatizadas",
  "alternatives": {
    "byUser": "Puedes descargar videos de un usuario específico usando: GET /api/tiktok/search/:username",
    "byUrls": "Puedes descargar videos específicos usando sus URLs con: POST /api/tiktok/batch con un array de URLs",
    "singleVideo": "Para un solo video, usa la interfaz principal o: POST /api/tiktok/download/video"
  }
}
```

#### Alternativas Recomendadas

**1. Descarga por Usuario (si conoces al creador)**
```bash
curl -O -J http://localhost:5000/api/tiktok/search/@username
```

**2. Descarga Múltiple de URLs Específicas**
Si tienes las URLs de videos con ese hashtag:
```bash
curl -X POST http://localhost:5000/api/tiktok/batch \
  -H "Content-Type: application/json" \
  -d '{"urls": ["url1", "url2", "url3"]}' \
  -O -J
```

**3. Búsqueda Manual + Batch Download**
1. Abre TikTok en tu navegador
2. Busca el hashtag manualmente
3. Copia las URLs de los videos que quieres
4. Usa el endpoint `/api/tiktok/batch` para descargarlos todos juntos

---

## 3. Descarga Múltiple

### **POST /api/tiktok/batch**

Descarga **múltiples videos** de diferentes URLs en un solo ZIP.

#### Request Body
```json
{
  "urls": [
    "https://www.tiktok.com/@user1/video/123",
    "https://www.tiktok.com/@user2/video/456",
    "https://www.tiktok.com/@user3/video/789"
  ]
}
```

#### cURL
```bash
curl -X POST http://localhost:5000/api/tiktok/batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.tiktok.com/@tiktok/video/7123456789",
      "https://www.tiktok.com/@tiktok/video/7987654321"
    ]
  }' \
  -O -J
```

#### JavaScript
```javascript
async function batchDownload(urls) {
  const response = await fetch('/api/tiktok/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ urls })
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tiktok-batch.zip';
  a.click();
}

// Uso
const myVideos = [
  'https://www.tiktok.com/@user1/video/123',
  'https://www.tiktok.com/@user2/video/456',
  'https://www.tiktok.com/@user3/video/789'
];

batchDownload(myVideos);
```

#### Python
```python
import requests

urls = [
    'https://www.tiktok.com/@user1/video/123',
    'https://www.tiktok.com/@user2/video/456',
    'https://www.tiktok.com/@user3/video/789'
]

response = requests.post(
    'http://localhost:5000/api/tiktok/batch',
    json={'urls': urls}
)

with open('batch-videos.zip', 'wb') as f:
    f.write(response.content)

print(f'✅ Descargados {len(urls)} videos')
```

#### Respuesta
- **Formato**: ZIP
- **Nombre archivo**: `tiktok-batch-{N}-videos.zip`
- **Contenido**: Todos los videos solicitados
- **Límite**: Máximo 20 URLs por solicitud

#### Validaciones
- ✅ Mínimo 1 URL
- ✅ Máximo 20 URLs
- ✅ Debe ser un array
- ❌ Error si el array está vacío

#### Casos de Uso
- 📚 Crear colecciones temáticas
- 💾 Backup de contenido importante
- 🎬 Compilar videos de múltiples creadores
- 📦 Descargar lista de favoritos

---

## 4. Estadísticas de Usuario

### **GET /api/tiktok/user/:username/stats**

Obtiene **estadísticas completas** de un perfil sin descargar videos.

#### Ejemplo
```bash
curl http://localhost:5000/api/tiktok/user/@tiktok/stats
```

#### JavaScript
```javascript
async function getUserStats(username) {
  const response = await fetch(`/api/tiktok/user/${username}/stats`);
  const stats = await response.json();
  console.log(stats);
  return stats;
}

// Uso
const stats = await getUserStats('@charlidamelio');
console.log(`Seguidores: ${stats.followerCount}`);
console.log(`Videos: ${stats.videoCount}`);
```

#### Python
```python
import requests

username = 'tiktok'
response = requests.get(f'http://localhost:5000/api/tiktok/user/@{username}/stats')
stats = response.json()

print(f"Usuario: {stats['nickname']}")
print(f"Seguidores: {stats['followerCount']:,}")
print(f"Videos: {stats['videoCount']:,}")
print(f"Verificado: {stats['verified']}")
```

#### Respuesta JSON
```json
{
  "username": "tiktok",
  "nickname": "TikTok",
  "verified": true,
  "followerCount": 50000000,
  "videoCount": 1234,
  "totalViews": 1000000000,
  "bio": "Make Your Day",
  "avatar": "https://...",
  "latestVideo": {
    "id": "7123456789",
    "title": "Latest video title",
    "views": 1000000,
    "likes": 50000,
    "comments": 5000,
    "uploadDate": "20250120"
  }
}
```

#### Casos de Uso
- 📊 Análisis de influencers
- 🔍 Investigación de competencia
- 📈 Tracking de crecimiento
- 🎯 Identificar colaboradores potenciales

---

## 5. Metadata en Lote

### **POST /api/tiktok/metadata/batch**

Extrae **metadata completa** de múltiples videos sin descargarlos.

#### Request Body
```json
{
  "urls": [
    "https://www.tiktok.com/@user1/video/123",
    "https://www.tiktok.com/@user2/video/456"
  ]
}
```

#### cURL
```bash
curl -X POST http://localhost:5000/api/tiktok/metadata/batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.tiktok.com/@tiktok/video/7123456789"
    ]
  }'
```

#### JavaScript
```javascript
async function getMetadataBatch(urls) {
  const response = await fetch('/api/tiktok/metadata/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ urls })
  });
  
  const data = await response.json();
  return data;
}

// Uso
const urls = [
  'https://www.tiktok.com/@user1/video/123',
  'https://www.tiktok.com/@user2/video/456'
];

const metadata = await getMetadataBatch(urls);
console.log(`Procesados: ${metadata.successful}/${metadata.total}`);
metadata.results.forEach(result => {
  if (result.success) {
    console.log(`${result.data.title} - ${result.data.views} views`);
  }
});
```

#### Python
```python
import requests

urls = [
    'https://www.tiktok.com/@user1/video/123',
    'https://www.tiktok.com/@user2/video/456'
]

response = requests.post(
    'http://localhost:5000/api/tiktok/metadata/batch',
    json={'urls': urls}
)

data = response.json()

print(f"Total: {data['total']}")
print(f"Exitosos: {data['successful']}")
print(f"Fallidos: {data['failed']}")

for result in data['results']:
    if result['success']:
        video = result['data']
        print(f"\n{video['title']}")
        print(f"  Views: {video['views']:,}")
        print(f"  Likes: {video['likes']:,}")
        print(f"  Creator: {video['creator']}")
```

#### Respuesta JSON
```json
{
  "total": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "success": true,
      "url": "https://www.tiktok.com/@user1/video/123",
      "data": {
        "id": "7123456789",
        "title": "Video title",
        "description": "Video description",
        "creator": "username",
        "views": 1000000,
        "likes": 50000,
        "comments": 5000,
        "shares": 1000,
        "duration": 30,
        "uploadDate": "20250120",
        "thumbnail": "https://...",
        "music": {
          "title": "Song name",
          "author": "Artist name"
        }
      }
    },
    {
      "success": false,
      "url": "https://www.tiktok.com/@user2/video/456",
      "error": "Video not found"
    }
  ]
}
```

#### Límites
- ✅ Máximo 50 URLs por solicitud
- ⚡ Procesamiento secuencial
- 📊 Respuesta incluye éxitos y fallos

#### Casos de Uso
- 📊 Análisis masivo de contenido
- 🔍 Búsqueda de videos virales
- 📈 Tracking de engagement
- 🎯 Curación de contenido
- 💾 Base de datos de videos

---

## 📊 Comparativa de Endpoints

| Endpoint | Tipo | Input | Output | Límite | Descarga |
|----------|------|-------|--------|--------|----------|
| `/search/:username` | GET | Username | ZIP (5 videos) | 5 videos | ✅ Sí |
| `/hashtag/:tag` | GET | Hashtag | ZIP (10 videos) | 10 videos | ✅ Sí |
| `/batch` | POST | URLs array | ZIP (N videos) | 20 URLs | ✅ Sí |
| `/user/:username/stats` | GET | Username | JSON stats | - | ❌ No |
| `/metadata/batch` | POST | URLs array | JSON metadata | 50 URLs | ❌ No |

---

## 🎯 Casos de Uso Completos

### Caso 1: Análisis de Tendencias
```python
# 1. Obtener videos de hashtags populares
import requests

hashtags = ['fyp', 'viral', 'trending']
for tag in hashtags:
    requests.get(f'http://localhost:5000/api/tiktok/hashtag/{tag}')

# 2. Extraer metadata sin descargar
urls = ['url1', 'url2', 'url3']
metadata = requests.post(
    'http://localhost:5000/api/tiktok/metadata/batch',
    json={'urls': urls}
).json()

# 3. Analizar engagement
for result in metadata['results']:
    if result['success']:
        print(f"Engagement: {result['data']['likes'] / result['data']['views']}")
```

### Caso 2: Backup de Creador
```javascript
// 1. Obtener stats del creador
const stats = await fetch('/api/tiktok/user/@creator/stats').then(r => r.json());

// 2. Descargar sus últimos videos
await fetch(`/api/tiktok/search/@creator`);

// 3. Guardar metadata
const metadata = await fetch('/api/tiktok/metadata/batch', {
  method: 'POST',
  body: JSON.stringify({ urls: videoUrls })
}).then(r => r.json());
```

### Caso 3: Curación de Contenido
```bash
# 1. Descargar videos de múltiples hashtags
curl -O -J http://localhost:5000/api/tiktok/hashtag/cooking
curl -O -J http://localhost:5000/api/tiktok/hashtag/recipes
curl -O -J http://localhost:5000/api/tiktok/hashtag/foodie

# 2. Descargar videos específicos
curl -X POST http://localhost:5000/api/tiktok/batch \
  -H "Content-Type: application/json" \
  -d '{"urls": ["url1", "url2", "url3"]}'
```

---

## 🔧 Códigos de Error

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Invalid username/hashtag | Caracteres inválidos |
| 400 | Array vacío | No se proporcionaron URLs |
| 400 | Límite excedido | Más URLs del máximo permitido |
| 500 | yt-dlp error | Video no disponible/privado |
| 500 | Download failed | Error en la descarga |

---

## 💡 Tips y Mejores Prácticas

1. **Batch vs Individual**: Para más de 3 videos, usa `/batch` en vez de llamadas individuales
2. **Metadata primero**: Usa `/metadata/batch` para filtrar antes de descargar
3. **Stats para análisis**: Revisa `/user/:username/stats` antes de descargar todo el perfil
4. **Hashtags populares**: Los hashtags con millones de videos pueden tardar más
5. **Límites razonables**: No excedas los límites para evitar timeouts

---

¡Estos endpoints hacen de esta API una herramienta completa para análisis y descarga de TikTok! 🚀
