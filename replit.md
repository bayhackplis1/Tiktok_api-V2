# Overview

This project is a web application designed for downloading TikTok videos, slideshow previews, and audio from provided TikTok URLs. It features a modern, responsive, cyberpunk/synthwave-themed user interface with neon effects, holographic animations, and scan line effects. The application aims to provide a stylish and functional tool for content archival by offering comprehensive video information extraction, diverse download capabilities, and robust download history tracking. It supports various download types, including videos, slideshow preview/thumbnail images, and audio, along with advanced features like batch downloads, user profile statistics, and metadata extraction for multiple URLs.

## Recent Improvements (Octubre 2025)

### Seguridad y Código Limpio
- **CRÍTICO**: Eliminada vulnerabilidad de inyección de comandos - todas las llamadas a yt-dlp ahora usan `spawn()` con arrays de argumentos
- Funciones helper reutilizables para formateo (duración, tamaños, números, fechas, hashtags) - código DRY
- **URLs de audio implementadas**: Extrae ID de música → busca videos con ese audio vía API → descarga audio del primer video
- Imports optimizados y código duplicado eliminado

### Chat Global en Tiempo Real (Octubre 28, 2025)
- ✅ **Chat Global**: Sistema de chat en tiempo real con WebSocket para comunicación instantánea entre usuarios
  - Modal de ingreso que solicita nombre y edad antes de acceder al chat
  - Interfaz similar a WhatsApp con burbujas de mensajes diferenciadas
  - Contador de usuarios online en tiempo real
  - Diseño responsive con el mismo tema cyberpunk/synthwave del resto de la aplicación
  - Mensajes persistentes almacenados en base de datos PostgreSQL
  - Validación de conexión WebSocket antes de enviar mensajes
  - Feedback visual cuando la conexión no está lista

### Funcionalidades Estables
- ✅ Descargas de videos, audio y slideshows
  - **Slideshows**: Descarga ZIP con TODAS las imágenes individuales (no solo preview)
  - **Video de slideshow**: Descarga el audio del slideshow
- ✅ Expansión automática de URLs cortas (vm.tiktok.com)
- ✅ Batch downloads (hasta 20 URLs simultáneas)
- ✅ Análisis masivo de metadata (hasta 50 URLs)
- ✅ Búsqueda por usuario
- ✅ **URLs de audio directas (/music/)** - ahora soportadas usando @tobyg74/tiktok-api-dl
- ✅ **Búsqueda por palabras clave** - funcionalidad que permite buscar:
  - Videos por palabra clave (hasta 15 resultados)
  - Usuarios por nombre (hasta 15 resultados)
  - Requiere cookie de TikTok configurada en secrets (TIKTOK_COOKIE)
  - **Click-to-download en videos**: Los videos son clickeables y te llevan al inicio con la URL pre-cargada y auto-submit
  - **Click-to-search en usuarios**: Los usuarios son clickeables y te llevan a la búsqueda por @ con su username pre-cargado y auto-submit
  - **API de descarga directa**: GET `/api/tiktok/searchkeyword/:keyword` - busca y descarga automáticamente un video ALEATORIO de los resultados encontrados, con metadata detallada en headers HTTP

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript, using Vite.
- **UI Framework**: Radix UI components integrated with shadcn/ui, styled with Tailwind CSS.
- **Theming**: Custom cyberpunk/synthwave theme with a purple gradient background, neon accents, and subtle animations.
- **State Management**: React Hook Form for forms, TanStack React Query for server state.
- **Local Storage**: Used for download history and favorites.
- **Routing**: Wouter for client-side routing.
- **Form Validation**: Zod.
- **Key Features**:
    - **Download Options**: Standard videos, **slideshow preview/thumbnail (single high-quality image)**, combined slideshow video-with-music, and standalone audio.
    - **Metadata Display**: Creator info, engagement stats, audio details, technical specs, hashtags, upload dates.
    - **User Interface**: Responsive design optimized for mobile and desktop, featuring holographic cards and floating icons.
    - **TikTok Search**: Real-time search by username using `yt-dlp` returning up to 15 videos with metadata.
    - **Keyword Search**: Nueva página dedicada para búsqueda por palabras clave con tabs para videos/usuarios. Muestra tarjetas visuales con preview, estadísticas y metadata.
    - **Global Chat**: Real-time chat system with WebSocket integration, user authentication via name/age modal, online user counter, and WhatsApp-like interface design.
    - **Download History**: Local storage-based, searchable, filterable, sortable, with JSON/CSV export.
    - **URL Input**: Real-time validation, recent URLs dropdown.
    - **Batch Operations**: Dedicated pages for batch downloading multiple URLs and mass metadata analysis.
    - **Engagement Analytics**: Real-time rate calculation (viral/excellent/good/average).
    - **Animations**: `fade-in-up`, `floating`, `pulse-border`, `stat-shine`, `hologram-sweep`, `neon-flicker`, `glitch`.

## Backend Architecture
- **Runtime**: Node.js with Express.js, TypeScript.
- **External Tool Integration**: `yt-dlp` for TikTok processing, metadata extraction, search, and slideshow thumbnail extraction. `curl` for expanding short TikTok URLs (vm.tiktok.com). `@tobyg74/tiktok-api-dl` for keyword search and music URL support.
- **API Design**: RESTful endpoints under `/api` for:
  - `/api/tiktok/info`: Get metadata for a single video.
  - `/api/tiktok/download/:type`: Download video, audio, or slideshow images.
  - `/api/tiktok/search`: POST endpoint for searching by username (for UI display).
  - `GET /api/tiktok/search/:username`: Download 5 latest videos as ZIP.
  - `GET /api/tiktok/hashtag/:tag`: (Currently unavailable, returns 501).
  - `POST /api/tiktok/batch`: Batch download multiple URLs (max 20) as ZIP.
  - `GET /api/tiktok/user/:username/stats`: Get user profile statistics (JSON).
  - `POST /api/tiktok/metadata/batch`: Extract metadata from multiple URLs (max 50) as JSON.
  - `POST /api/tiktok/search/keyword`: Search videos or users by keyword (max 15 results). Requires TIKTOK_COOKIE secret.
  - `GET /api/tiktok/searchkeyword/:keyword`: Search videos by keyword and automatically download a RANDOM result with detailed metadata in HTTP headers. Requires TIKTOK_COOKIE secret.
    - Returns: MP4 file
    - Headers include: Video ID, Author, Username, Description, Likes, Views, Comments, Shares, Duration, Upload Date, URL, Search info
    - Example: `curl -i http://localhost:5000/api/tiktok/searchkeyword/dance` (use -i to see metadata headers)
  - `GET /api/chat/messages`: Get the latest 100 chat messages (JSON).
  - `POST /api/chat/messages`: Create a new chat message (JSON).
- **WebSocket Server**: Real-time communication on `/ws` path for:
  - User join/leave events with username and age
  - Live message broadcasting to all connected clients
  - Online user count updates
  - Persistent message storage in PostgreSQL
- **Slideshow Support**: Robust detection and handling for TikTok slideshows. For video downloads, returns MP3 audio. For image downloads, returns the **preview/thumbnail** extracted directly from yt-dlp metadata (reliable, no web scraping issues).
- **Short URL Support**: Automatically expands short TikTok URLs (vm.tiktok.com, vt.tiktok.com) to full URLs and cleans query parameters before processing.
- **Security**: Input validation, error handling, and use of `spawn()` for external commands to prevent command injection.
- **File Management**: Automatic temporary file cleanup after downloads.

## Database Architecture
- **ORM**: Drizzle ORM with TypeScript.
- **Database**: PostgreSQL (configured for Neon serverless).
- **Schema Management**: Drizzle Kit.
- **Connection**: Connection pooling with `@neondatabase/serverless`.

# External Dependencies

- **Neon Database**: Serverless PostgreSQL hosting.
- **yt-dlp**: Command-line tool for TikTok video processing, metadata extraction, and search.
- **Radix UI**: Headless UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **TanStack React Query**: Data fetching and caching.
- **Vite**: Build tool and development server.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **Lucide React**: Icon library.