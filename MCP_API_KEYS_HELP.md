# 📋 GUÍA RÁPIDA PARA OBTENER API KEYS

## 🐙 GITHUB TOKEN:
1. Ve a: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Selecciona estos scopes:
   ✅ repo (acceso completo a repositorios)
   ✅ read:org (leer organizaciones)
   ✅ read:user (leer perfil de usuario)
4. Click "Generate token"
5. Copia el token (ghp_xxxxxxxxxxxxxxxxxxxx)
6. Reemplaza en .env.mcp: GITHUB_TOKEN=tu_token_aquí

## 🔍 BRAVE SEARCH API:
1. Ve a: https://api.search.brave.com/
2. Regístrate con tu email
3. Plan gratuito: 2000 consultas/mes
4. Copia tu API key (BSAxxxxxxxxxxxxxxxx)
5. Reemplaza en .env.mcp: BRAVE_API_KEY=tu_key_aquí

## 🗄️ DATABASE (PostgreSQL):
Si tienes PostgreSQL local:
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/altamedica

Si usas Docker:
docker run --name altamedica-postgres -e POSTGRES_PASSWORD=mypassword -p 5432:5432 -d postgres

## ⚡ ACTIVACIÓN RÁPIDA:
1. Edita .env.mcp con tus keys reales
2. Reinicia VS Code
3. Ctrl+Shift+P → "MCP: Start Servers"
4. ¡Listo!
