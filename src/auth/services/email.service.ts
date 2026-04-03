import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(this.configService.get<string>('SMTP_PORT', '587')),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USERNAME'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    newPassword: string,
    adminName: string,
  ): Promise<boolean> {
    const mailOptions = {
      from: this.configService.get<string>(
        'SMTP_FROM',
        'no-reply@seguridad.com',
      ),
      to: email,
      subject: 'Tu contraseña ha sido actualizada',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">🔐 Seguridad - Contraseña Actualizada</h1>
          <p>Hola,</p>
          <p>El administrador <strong>${adminName}</strong> ha actualizado tu contraseña.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;">Tu nueva contraseña es:</p>
            <h2 style="color: #059669; margin: 10px 0;">${newPassword}</h2>
          </div>
          <p>Por favor, inicia sesión y cambia tu contraseña por una que recuerdes.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Si no solicitaste este cambio, por favor contacta al administrador inmediatamente.
          </p>
          <p style="margin-top: 20px;">Saludos,<br>Equipo de Seguridad</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(
    email: string,
    username: string,
    password: string,
    adminName: string,
  ): Promise<boolean> {
    const mailOptions = {
      from: this.configService.get<string>(
        'SMTP_FROM',
        'no-reply@seguridad.com',
      ),
      to: email,
      subject: 'Bienvenido al sistema de Seguridad',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">🎉 Bienvenido a Seguridad</h1>
          <p>Hola <strong>${username}</strong>,</p>
          <p>El administrador <strong>${adminName}</strong> ha creado tu cuenta.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;">Tus credenciales de acceso son:</p>
            <p style="margin: 10px 0;"><strong>Usuario:</strong> ${username}</p>
            <p style="margin: 0;"><strong>Contraseña:</strong> ${password}</p>
          </div>
          <p>Por favor, cambia tu contraseña después de iniciar sesión.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Si tienes alguna duda, contacta al administrador.
          </p>
          <p style="margin-top: 20px;">Saludos,<br>Equipo de Seguridad</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  async sendRecoveryEmail(
    email: string,
    newPassword: string,
    username: string,
  ): Promise<boolean> {
    const systemName = this.configService.get<string>(
      'SYSTEM_NAME',
      'Sistema de Seguridad',
    );

    const mailOptions = {
      from: this.configService.get<string>(
        'SMTP_FROM',
        'no-reply@seguridad.com',
      ),
      to: email,
      subject: `🔐 Recuperación de tu cuenta - ${systemName}`,
      html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperación de Cuenta</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                🔐 Recuperación de Cuenta
              </h1>
              <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">
                ${systemName}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">
                Hola, <span style="color: #3b82f6;">${username}</span>
              </h2>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                Hemos recibido una solicitud para recuperar el acceso a tu cuenta. 
                A continuación encontrarás tus nuevas credenciales de acceso:
              </p>
              
              <!-- Credentials Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px; font-weight: 500;">📧 Correo:</span>
                          <br>
                          <span style="color: #1f2937; font-size: 16px; font-weight: 600;">${email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0 0 0;">
                          <span style="color: #6b7280; font-size: 14px; font-weight: 500;">🔑 Nueva Contraseña:</span>
                          <br>
                          <span style="color: #059669; font-size: 20px; font-weight: 700; letter-spacing: 2px;">${newPassword}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Warning -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 0 8px 8px 0; margin: 25px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 600;">
                  ⚠️ IMPORTANTE
                </p>
                <p style="color: #92400e; margin: 8px 0 0 0; font-size: 14px;">
                  Esta contraseña es temporal. Por favor, <strong>cambia tu contraseña inmediatamente</strong> después de iniciar sesión.
                </p>
              </div>
              
              <!-- Security Notice -->
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                Si no solicitaste este cambio, te recomendamos cambiar tu contraseña inmediatamente 
                o contactar al administrador del sistema para reportar esta actividad.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Este es un mensaje automático. Por favor, no respondas a este correo.
              </p>
              <p style="color: #6b7280; font-size: 13px; margin: 10px 0 0 0;">
                <strong>Equipo de ${systemName}</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending recovery email:', error);
      return false;
    }
  }
}
