# Protocolo de Integración Frontend - Backend

Este documento detalla el protocolo y las especificaciones necesarias para que el Frontend (desarrollado en Angular o cualquier framework moderno) pueda comunicarse correctamente con las APIs de autenticación y gestión de usuarios del Backend en NestJS.

## 1. Consideraciones Globales

- **Base URL:** Todas las peticiones deben dirigirse a la URL local del backend (ej. `http://localhost:3000`).
- **Headers Requeridos:** Para el envío de datos, se debe incluir siempre el header:
  - `Content-Type: application/json`
- **Manejo de Sesión (Cookies):** El sistema utiliza JWT integrado en **Cookies HTTP-Only**. El frontend **no necesita ni debe** intentar leer/guardar el token manualmente en variables como `localStorage` o `sessionStorage`. Es fundamental que en cada petición HTTP desde el frontend se configure el envío de credenciales:
  - En Angular (`HttpClient`): `{ withCredentials: true }`
  - En Axios: `{ withCredentials: true }`
  - En Fetch: `{ credentials: 'include' }`

---

## 2. Iniciar Sesión (Login)

Este endpoint valida las credenciales y devuelve el JWT a través de una Cookie llamada `Authentication`.

- **Endpoint:** `POST /auth/login`
- **Requiere JWT (Autenticación Previa):** No.

**Cuerpo de la Petición (Request Body):**
```json
{
  "email": "admin@marher.com",
  "password": "password123"
}
```

**Variables requeridas desde el formulario Frontend:**
1. `email`: formato de correo válido.
2. `password`: mínimo de 6 caracteres.

**Respuesta Esperada (Response):**
En caso de éxito (HTTP 200 OK), el backend configura la cookie `Authentication` automáticamente en el navegador, y el cuerpo de la respuesta contiene un JSON con los datos del usuario:
```json
{
  "id": "uuid-del-usuario",
  "email": "admin@marher.com",
  "nombreCompleto": "Ejemplo Admin",
  "username": "admin123"
}
```

---

## 3. Registro Público (Register)

Endpoint diseñado para el registro independiente de usuarios que entran por el portal y se loguean por primera vez, sin intermediarios.

- **Endpoint:** `POST /auth/register`
- **Requiere JWT (Autenticación Previa):** En el código actual, depende de si tienes el `@UseGuards(JwtAuthGuard)` activado (en `auth.controller.ts` este endpoint actualmente lo tiene y requeriría ser administrador o estar logueado para usarlo, revisarlo si esto es intencionado, de lo contrario habría que desactivarlo para registros 100% públicos).

**Cuerpo de la Petición (Request Body):**
```json
{
  "nombreCompleto": "Usuario Público",
  "username": "publico123",
  "email": "publico@correo.com",
  "password": "secreto123",
  "direccion": "123 Calle Principal, Ciudad",    // Opcional
  "telefono": "+1234567890"                       // Opcional
}
```

**Variables a procesar desde el formulario Frontend:**
1. `nombreCompleto` (requerido)
2. `username` (requerido)
3. `email` (requerido, formato email)
4. `password` (requerido, min 6 caracteres)
5. `direccion` (opcional)
6. `telefono` (opcional)

---

## 4. Crear Usuario / Registrar a un tercero (Panel Gestión)

Endpoint para crear un nuevo usuario. Generalmente ejecutado desde el listado de usuarios o panel de administrador donde un rol con los debidos permisos crea nuevas cuentas.

- **Endpoint:** `POST /users`
- **Requiere JWT (Autenticación Previa):** **SÍ**. El frontend debe tener la sesión activa, e incluir `withCredentials: true` para que la petición autorice la creación.

**Cuerpo de la Petición (Request Body):**
```json
{
  "nombreCompleto": "Juan Perez",
  "username": "jperez",
  "email": "juan.perez@marher.com",
  "password": "secreto123"
}
```

**Variables a enviar por el Frontend:**
1. `nombreCompleto` (requerido)
2. `username` (requerido)
3. `email` (requerido, formato válido)
4. `password` (requerido, min 6 caracteres)

*(Si un usuario crea a otro "con ese permiso", es el servicio del backend que evalúa las políticas de acceso basado en el JWT quién es el que autoriza o deniega el POST a `/users` o delega en la base de datos Supabase/PostgreSQL).*

---

## 5. Implementación en Angular (Ejemplo Interceptor / Servicio)

Es recomendable en Angular utilizar la configuración global de peticiones HTTP para siempre pasar las Cookies automáticamente al entorno de backend.

**Ejemplo de Servicio de Autenticación (`auth.service.ts`):**

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrlAuth = 'http://localhost:3000/auth';
  private apiUrlUsers = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  // 1. LOGIN
  login(credentials: any): Observable<any> {
    // Es FUNDAMENTAL enviar { withCredentials: true } para que el navegador reciba
    // y guarde el Token Set-Cookie que envía el servidor.
    return this.http.post(`${this.apiUrlAuth}/login`, credentials, { withCredentials: true });
  }

  // 2. REGISTRO PÚBLICO
  registerPublic(userData: any): Observable<any> {
    // Si la ruta auth/register requiere JWT (dependiendo tu lógica de NestJS) envia con withCredentials
    return this.http.post(`${this.apiUrlAuth}/register`, userData, { withCredentials: true });
  }

  // 3. REGISTRAR USUARIO DESDE PANEL Y PERMISOS
  createUserByAdmin(userData: any): Observable<any> {
    // Como requiere JwtAuthGuard, withCredentials es estricamente obligatorio para
    // que el JWT viaje con la petición al backend.
    return this.http.post(this.apiUrlUsers, userData, { withCredentials: true });
  }
}
```
