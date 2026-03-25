import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Reemplazar o asegurar que estas credenciales coincidan con las del .env
const SUPABASE_URL = 'https://irqmgfciwesoxfpqxotl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CTAfUFfbi_WUPYNJr_9NWw_Yszg0K_V';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const usersToSeed = [
  // ADMIN
  {
    nombre_completo: 'Administrador Principal',
    username: 'admin',
    email: 'admin@marher.com',
    password_plain: '$p4$ww0rD1234', // o 'password' según requieras
    permisos_globales: [
      'user:view', 'user:add', 'user:edit', 'user:edit:profile', 'user:delete', 'user:manage',
      'group:view', 'group:add', 'group:edit', 'group:delete', 'group:manage',
      'ticket:view', 'ticket:add', 'ticket:edit', 'ticket:delete', 'ticket:edit:state', 'ticket:edit:comment', 'ticket:manage'
    ]
  },
  // PROJECT MANAGER
  {
    nombre_completo: 'Project Manager',
    username: 'pm',
    email: 'pm@marher.com',
    password_plain: '$p4$ww0rD1234',
    permisos_globales: [
      'user:view', 'user:edit:profile',
      'group:view', 'group:add', 'group:edit', 'group:delete', 'group:manage',
      'ticket:view', 'ticket:add', 'ticket:edit', 'ticket:delete', 'ticket:edit:state', 'ticket:edit:comment', 'ticket:manage'
    ]
  },
  // DEVELOPER
  {
    nombre_completo: 'Desarrollador',
    username: 'dev',
    email: 'dev@marher.com',
    password_plain: '$p4$ww0rD1234',
    permisos_globales: [
      'user:view', 'user:edit:profile',
      'group:view',
      'ticket:view', 'ticket:add', 'ticket:edit', 'ticket:edit:state', 'ticket:edit:comment'
    ]
  },
  // SUPPORT
  {
    nombre_completo: 'Soporte',
    username: 'support',
    email: 'support@marher.com',
    password_plain: '$p4$ww0rD1234',
    permisos_globales: [
      'user:view', 'user:edit:profile',
      'group:view',
      'ticket:view', 'ticket:add', 'ticket:edit:comment'
    ]
  }
];

async function runSeed() {
  console.log('Iniciando Seeding de usuarios iniciales...');
  for (const user of usersToSeed) {
    // 1. Verificar si ya existe el correo
    const { data: existing } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', user.email)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`El usuario ${user.email} ya existe en la base de datos. Saltando...`);
      continue;
    }

    // 2. Hashear contraseña
    const hashedPassword = await bcrypt.hash(user.password_plain, 10);
    const dt = new Date().toISOString().split('T')[0];

    // 3. Insertar
    const { data, error } = await supabase
      .from('usuarios')
      .insert([
        {
          nombre_completo: user.nombre_completo,
          username: user.username,
          email: user.email,
          password: hashedPassword,
          permisos_globales: user.permisos_globales,
          fecha_inicio: dt
        }
      ])
      .select('email')
      .single();

    if (error) {
      console.error(`Error al insertar ${user.email}: `, error.message);
    } else {
      console.log(`Usuario insertado exitosamente: ${data.email}`);
    }
  }
  console.log('✔ Seeding completado.');
}

runSeed();
