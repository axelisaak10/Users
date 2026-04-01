# 🔐 Backend de Autenticación - Microservicio de Usuarios

> Microservicio NestJS para autenticación y gestión de perfiles de usuarios. Diseñado para arquitectura de microservicios con verificación de permisos en cascada.

[![NestJS](https://img.shields.io/badge/NestJS-11.x-red?style=flat-square&logo=nestjs)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com)

---

## 📋 Tabla de Contenidos

1. [Descripción](#descripción)
2. [Tecnologías](#-tecnologías)
3. [Arquitectura](#-arquitectura)
4. [Endpoints](#-endpoints)
5. [Sistema de Permisos](#-sistema-de-permisos)
6. [Formatos de Respuesta](#-formatos-de-respuesta)
7. [Modelos de Datos](#-modelos-de-datos)
8. [Variables de Entorno](#-variables-de-entorno)
9. [Instalación](#-instalación)
10. [Scripts Disponibles](#-scripts-disponibles)
11. [Ejemplos de Uso](#-ejemplos-de-uso)

---

## 📝 Descripción

Este microservicio es responsable de:

- ✅ **Autenticación de usuarios** (login/logout)
- ✅ **Registro de nuevos usuarios**
- ✅ **Gestión de perfiles** (ver/editar datos propios)
- ✅ **Sistema de permisos en cascada** (verificación contra base de datos)
- ✅ **Comunicación con otros microservicios** via JWT

### Características Principales

- **JWT con cookies httpOnly** para seguridad
- **Verificación de permisos en cascada** (BD → JWT → API)
- **Bcrypt** para hash de contraseñas
- **Supabase** como base de datos PostgreSQL
- **Swagger** para documentación de API (`/api`)

---

## 🛠 Tecnologías

| Tecnología          | Propósito                |
| ------------------- | ------------------------ |
| **NestJS 11.x**     | Framework backend        |
| **TypeScript**      | Lenguaje tipado          |
| **Supabase**        | Base de datos PostgreSQL |
| **JWT (Passport)**  | Autenticación            |
| **Bcrypt**          | Hash de contraseñas      |
| **class-validator** | Validación de DTOs       |
| **Swagger**         | Documentación API        |

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      MICROSERVICIO AUTH                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Login      │───▶│  JWT Token   │───▶│   Cookie     │  │
│  │              │    │  + permisos  │    │  httpOnly    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              VERIFICACIÓN EN CASCADA                  │    │
│  │                                                       │    │
│  │   JWT ──▶ BD consulta permisos ──▶ Validar ──▶ API   │    │
│  │                                                       │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Autenticación

```
1. Usuario envía credentials → /auth/login
2. Servidor valida contra Supabase
3. Si válido: genera JWT con permisos (nombres)
4. JWT se guarda en cookie httpOnly
5. API subsiguientes: JWT → BD verifica permisos → Responde
```

---

## 📡 Endpoints

### Resumen

| Método  | Ruta             | Auth | Permiso Requerido   | Descripción       |
| ------- | ---------------- | ---- | ------------------- | ----------------- |
| `POST`  | `/auth/login`    | No   | -                   | Iniciar sesión    |
| `POST`  | `/auth/register` | No   | -                   | Registrar usuario |
| `POST`  | `/auth/logout`   | JWT  | -                   | Cerrar sesión     |
| `GET`   | `/auth/me`       | JWT  | `user:profile:view` | Ver mi perfil     |
| `PATCH` | `/auth/profile`  | JWT  | `user:profile:edit` | Editar mi perfil  |

### Detalle de Endpoints

#### 🔓 POST `/auth/login`

**Descripción:** Inicia sesión y retorna JWT.

**Auth:** No requiere

**Request Body:**

```json
{
  "email": "usuario@ejemplo.com",
  "password": "Contraseña123"
}
```

**Response (200):**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id": "uuid-del-usuario",
  "permisos_globales": ["user:profile:view", "user:profile:edit"]
}
```

---

#### 🔓 POST `/auth/register`

**Descripción:** Registra un nuevo usuario.

**Auth:** No requiere

**Request Body:**

```json
{
  "nombre_completo": "Juan Perez",
  "username": "juanp",
  "email": "juan@ejemplo.com",
  "password": "Contraseña123",
  "fecha_inicio": "2024-03-25",
  "direccion": "Calle 123",
  "telefono": "+525551234567",
  "fecha_nacimiento": "1990-01-15"
}
```

**Response (201):**

```json
{
  "message": "Usuario registrado exitosamente",
  "email": "juan@ejemplo.com",
  "username": "juanp"
}
```

---

#### 🔒 POST `/auth/logout`

**Descripción:** Cierra la sesión del usuario.

**Auth:** JWT (requerido)

**Response (200):**

```json
{
  "message": "Sesion cerrada correctamente"
}
```

---

#### 🔒 GET `/auth/me`

**Descripción:** Obtiene los datos del perfil del usuario logueado.

**Auth:** JWT + Permiso `user:profile:view`

**Response (200):**

```json
{
  "id": "uuid-del-usuario",
  "nombre_completo": "Juan Perez",
  "username": "juanp",
  "email": "juan@ejemplo.com",
  "telefono": "+525551234567",
  "direccion": "Calle 123",
  "fecha_inicio": "2024-03-25",
  "fecha_nacimiento": "1990-01-15",
  "last_login": "2026-03-31T12:00:00.000Z",
  "creado_en": "2026-03-25T10:30:00.000Z",
  "permisos_globales": ["user:profile:view", "user:profile:edit"]
}
```

**Error (403):**

```json
{
  "statusCode": 403,
  "intOpCode": 1,
  "data": [
    {
      "message": "Permiso denegado: user:profile:view",
      "error": "Forbidden"
    }
  ]
}
```

---

#### 🔒 PATCH `/auth/profile`

**Descripción:** Actualiza los datos del perfil del usuario logueado.

**Auth:** JWT + Permiso `user:profile:edit`

**Request Body (todos opcionales):**

```json
{
  "nombre_completo": "Juan Perez Actualizado",
  "username": "juanp_updated",
  "email": "nuevo@ejemplo.com",
  "telefono": "+525559876543",
  "direccion": "Nueva Calle 456",
  "password": "NuevaContrasena123"
}
```

**Response (200):**

```json
{
  "id": "uuid-del-usuario",
  "nombre_completo": "Juan Perez Actualizado",
  "username": "juanp_updated",
  "email": "nuevo@ejemplo.com",
  "telefono": "+525559876543",
  "direccion": "Nueva Calle 456",
  "fecha_inicio": "2024-03-25",
  "fecha_nacimiento": "1990-01-15"
}
```

---

## 🔐 Sistema de Permisos

### Permisos Disponibles

#### Permisos de Usuario

| Permiso             | Descripción                 |
| ------------------- | --------------------------- |
| `user:profile:view` | Ver su propio perfil        |
| `user:profile:edit` | Editar su propio perfil     |
| `user:add`          | Crear nuevos usuarios       |
| `user:edit`         | Editar otros usuarios       |
| `user:delete`       | Suspender/eliminar usuarios |
| `user:manage`       | Gestión total de usuarios   |

#### Permisos de Grupos

| Permiso        | Descripción             |
| -------------- | ----------------------- |
| `group:view`   | Ver grupos y miembros   |
| `group:add`    | Crear grupos            |
| `group:edit`   | Editar grupos           |
| `group:delete` | Eliminar grupos         |
| `group:manage` | Gestión total de grupos |

#### Permisos de Tickets

| Permiso               | Descripción              |
| --------------------- | ------------------------ |
| `ticket:view`         | Ver tickets e historial  |
| `ticket:add`          | Crear tickets            |
| `ticket:edit`         | Editar tickets           |
| `ticket:delete`       | Eliminar tickets         |
| `ticket:edit:state`   | Cambiar estado           |
| `ticket:edit:comment` | Agregar comentarios      |
| `ticket:manage`       | Gestión total de tickets |

#### Permiso Especial

| Permiso      | Descripción                          |
| ------------ | ------------------------------------ |
| `superadmin` | Acceso irrestricto a todo el sistema |

### Flujo de Verificación de Permisos

```
1. Usuario hace login → JWT contiene permisos_globales (nombres)
2. API protegida recibe request con JWT
3. JwtAuthGuard valida JWT
4. authService consulta BD para verificar permisos actuales
5. Si tiene permiso → procesa request
6. Si NO tiene permiso → Error 403 Forbidden
```

### Estructura de Permisos en BD

```sql
-- Tabla permisos
CREATE TABLE permisos (
  id uuid PRIMARY KEY,
  nombre varchar(100) NOT NULL,
  descripcion text,
  creado_en timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Tabla usuarios (referencia a permisos)
CREATE TABLE usuarios (
  id uuid PRIMARY KEY,
  nombre_completo varchar(255) NOT NULL,
  permisos_globales uuid[] DEFAULT '{}',  -- Array de UUIDs
  ...
);
```

---

## 📦 Formatos de Respuesta

### Respuesta Exitosa

```json
{
  "statusCode": 200,
  "intOpCode": 0,
  "data": [
    {
      "key": "value"
    }
  ]
}
```

### Respuesta de Error

```json
{
  "statusCode": 400,
  "intOpCode": 1,
  "data": [
    {
      "timestamp": "2026-03-31T12:00:00.000Z",
      "path": "/auth/me",
      "message": "Credenciales invalidas",
      "error": "Unauthorized",
      "statusCode": 400
    }
  ]
}
```

### Códigos de Error

| statusCode | Significado                   |
| ---------- | ----------------------------- |
| 200        | Éxito                         |
| 201        | Creado                        |
| 400        | Bad Request (validación)      |
| 401        | Unauthorized (no autenticado) |
| 403        | Forbidden (sin permisos)      |
| 409        | Conflict (dato duplicado)     |
| 500        | Internal Server Error         |

---

## 🗄 Modelos de Datos

### Usuario

```typescript
interface Usuario {
  id: string; // UUID
  nombre_completo: string;
  username: string; // Único
  email: string; // Único
  password: string; // Hash bcrypt
  telefono?: string;
  direccion?: string;
  fecha_inicio: Date;
  fecha_nacimiento?: Date;
  last_login?: Date;
  permisos_globales: string[]; // Array de UUIDs
  creado_en: Date;
}
```

### Permiso

```typescript
interface Permiso {
  id: string; // UUID
  nombre: string; // Ej: "user:profile:view"
  descripcion?: string;
  creado_en: Date;
}
```

---

## 🔧 Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=tu-api-key

# JWT
JWT_SECRET=tu-super-secreto-jwt-key
```

### Notas de Seguridad

- ⚠️ `JWT_SECRET` debe ser largo y complejo
- ⚠️ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` es la key pública de Supabase
- ⚠️ La cookie JWT es `httpOnly` y `secure` para producción

---

## 🚀 Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd back-end-users

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar en desarrollo
npm run start:dev

# Ejecutar en producción
npm run build
npm run start:prod
```

---

## 📜 Scripts Disponibles

| Script                | Descripción                       |
| --------------------- | --------------------------------- |
| `npm run build`       | Compila el proyecto               |
| `npm run start`       | Inicia el servidor                |
| `npm run start:dev`   | Inicia en modo desarrollo (watch) |
| `npm run start:debug` | Inicia en modo debug              |
| `npm run start:prod`  | Inicia en producción              |
| `npm run lint`        | Linting con ESLint                |
| `npm run test`        | Ejecuta tests unitarios           |
| `npm run test:e2e`    | Ejecuta tests E2E                 |

---

## 📖 Ejemplos de Uso

### 1. Login con curl

```bash
curl -X POST http://localhost:3444/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@ejemplo.com","password":"Contraseña123"}' \
  -c cookies.txt
```

### 2. Obtener perfil (con cookie)

```bash
curl -X GET http://localhost:3444/auth/me \
  -b cookies.txt
```

### 3. Actualizar perfil

```bash
curl -X PATCH http://localhost:3444/auth/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"nombre_completo":"Nombre Actualizado"}'
```

### 4. Logout

```bash
curl -X POST http://localhost:3444/auth/logout \
  -b cookies.txt
```

### 5. Registro

```bash
curl -X POST http://localhost:3444/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_completo": "Nuevo Usuario",
    "username": "nuevouser",
    "email": "nuevo@ejemplo.com",
    "password": "Contraseña123",
    "fecha_inicio": "2024-03-25"
  }'
```

---

## 📚 Estructura del Proyecto

```
src/
├── auth/                      # Módulo de autenticación
│   ├── auth.controller.ts      # Endpoints
│   ├── auth.service.ts        # Lógica de negocio
│   ├── auth.module.ts         # Configuración del módulo
│   ├── jwt.strategy.ts        # Estrategia JWT
│   ├── jwt-auth.guard.ts      # Guard de autenticación
│   ├── permissions.guard.ts    # Guard de permisos
│   └── dto/                   # Data Transfer Objects
│       └── update-profile.dto.ts
├── database/
│   └── database.module.ts     # Configuración Supabase
├── common/                    # Componentes compartidos
│   ├── filters/               # Filtros de excepciones
│   ├── interceptors/          # Interceptores de respuesta
│   └── pipes/                 # Pipes de validación
├── app.module.ts              # Módulo principal
└── main.ts                    # Punto de entrada
```

---

## 🔗 Integración con Frontend

### Configuración de Cookie

```typescript
// El backend configura automáticamente la cookie 'Authentication'
// con httpOnly, secure y sameSite: 'none'

// Frontend puede leer el access_token de la respuesta del login
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
  credentials: 'include', // Importante para enviar cookies
});

const { access_token, permisos_globales } = await response.json();
```

### Verificación de Permisos en Frontend

```typescript
const hasPermission = (permisos: string[], required: string) => {
  return permisos.includes(required);
};

// Ejemplo
if (hasPermission(userData.permisos_globales, 'user:profile:edit')) {
  // Mostrar botón de editar perfil
}
```

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

---

## 👨‍💻 Autor
## Moises Godinez Venegas

**Backend Users Microservice** - Sistema de autenticación para arquitectura de microservicios.
