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
}
