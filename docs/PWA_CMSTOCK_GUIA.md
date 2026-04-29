# CM Stock PWA - Guia de instalacion completa (Vite + React)

## Objetivo
Esta guia documenta la implementacion PWA real de CM Stock en este repositorio.

Importante: tu guia base estaba orientada a Create React App (CRA), pero este proyecto usa Vite. Por eso aqui se ajustan comandos, rutas y build para Vite.

## 1. Estado actual del proyecto (diagnostico)
CM Stock ya incluye base PWA:
- Manifest: public/manifest.webmanifest
- Service Worker: public/sw.js
- Registro del SW en produccion: src/main.jsx
- Meta + manifest link en HTML: index.html

Esto significa que ya tienes el nucleo PWA funcionando y solo necesitas validar despliegue, pruebas y evidencias.

## 2. Requisitos previos
- Node.js 20+
- npm 10+
- Chrome (desktop y Android) para pruebas PWA
- HTTPS en produccion (obligatorio para camara y Service Worker)

## 3. Instalar dependencias del proyecto
```bash
npm install
```

Si deseas reinstalar solo la dependencia de generacion de iconos:
```bash
npm install canvas --save-dev
```

Generar carpeta de iconos PWA:
```bash
npm run generate:icons
```

## 4. Verificar archivos PWA clave
Confirma que existan:
- index.html
- public/manifest.webmanifest
- public/sw.js
- public/logo192.png
- public/logo512.png
- src/main.jsx

## 5. Desarrollo local
```bash
npm run dev
```

Abre la URL que muestra Vite (normalmente http://localhost:5173).

Notas:
- La camara QR funciona en localhost.
- En desarrollo, src/main.jsx desactiva SW y limpia caches para evitar JS/CSS obsoleto.
- El Service Worker se registra solo en build de produccion.

## 6. Build de produccion (PWA completa)
```bash
npm run build
```

Salida de build:
- dist/

Para probar localmente el build:
```bash
npm run preview -- --host --port 4173
```

## 7. Probar desde el celular usando ngrok
Terminal 1 (servir build):
```bash
npm run preview -- --host --port 4173
```

Terminal 2 (tunel HTTPS):
```bash
npx ngrok http 4173
```

Abre la URL HTTPS de ngrok en el movil y valida:
- Banner de instalacion
- Apertura en modo standalone
- Navegacion sin barra del navegador (segun dispositivo)

## 8. Despliegue productivo con HTTPS

### Opcion A - Vercel
```bash
npm i -g vercel
vercel --prod
```

### Opcion B - Netlify
- Build command: npm run build
- Publish directory: dist

### Opcion C - Nginx (servidor propio)
```nginx
server {
    listen 443 ssl;
    server_name tudominio.com;
    root /var/www/cm-stock/dist;
    index index.html;

    ssl_certificate     /etc/ssl/certs/tudominio.crt;
    ssl_certificate_key /etc/ssl/private/tudominio.key;

    location /sw.js {
        add_header Cache-Control "no-cache";
        add_header Service-Worker-Allowed "/";
    }

    location /manifest.webmanifest {
        types { application/manifest+json webmanifest; }
        default_type application/manifest+json;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 9. Instalacion en celular

### Android (Chrome)
1. Abrir URL HTTPS.
2. Tocar Instalar app o Agregar a pantalla de inicio.
3. Confirmar instalacion.

### iPhone (Safari)
1. Abrir URL HTTPS en Safari.
2. Compartir.
3. Agregar a pantalla de inicio.
4. Confirmar.

## 10. Funcionamiento offline (estado actual)
Con el Service Worker actual:
- Se cachea shell basico de app (/, manifest, iconos).
- Navegaciones HTML intentan red primero y fallback a cache.
- Recursos de mismo origen se guardan progresivamente.

Recomendacion para evidencias:
1. Abrir app online.
2. Navegar por modulos clave.
3. Activar modo avion.
4. Reabrir app y registrar que sigue operativa.

## 11. Versionado y actualizacion de app
El control de version de cache esta en public/sw.js:
- CACHE_NAME = "cmstock-v3"

Cuando publiques cambios importantes:
1. Incrementa version de cache (ej. cmstock-v3).
2. Ejecuta npm run build.
3. Despliega dist en servidor.
4. Valida actualizacion en cliente.

## 12. Checklist de documentacion (para tu informe)
Incluye capturas de:
1. Lighthouse con categoria PWA en verde.
2. Application > Manifest en DevTools.
3. Application > Service Workers activo.
4. Cache Storage con cache cmstock-vX.
5. Instalacion en Android/iOS.
6. Prueba offline exitosa.
7. Evidencia de HTTPS en entorno productivo.

## 13. Diferencias clave respecto a guia CRA
- No se usa create-react-app, se usa Vite.
- No existe carpeta build, en Vite es dist.
- Comando de desarrollo: npm run dev.
- Comando de vista de build: npm run preview.
- El archivo de entrada es src/main.jsx (no src/index.js).

---

Nota: en Vite 8 el paquete vite-plugin-pwa puede presentar incompatibilidades segun version. Esta implementacion usa Service Worker manual para garantizar estabilidad sin degradar el stack actual.
