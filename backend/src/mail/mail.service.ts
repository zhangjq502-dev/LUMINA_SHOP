import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
@Injectable()
export class MailService {
  async send(to: string, subject: string, text: string) {
    if (process.env.SMTP_HOST) {
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      });
      await transport.sendMail({
        from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
        to,
        subject,
        text,
      });
      return;
    }
    if (process.env.NODE_ENV === "production")
      throw new ServiceUnavailableException("邮件服务尚未配置");
    const directory =
      process.env.MAIL_OUTBOX_DIR ?? resolve(__dirname, "../../.mail-outbox");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(directory, `${Date.now()}-${randomUUID()}.json`),
      JSON.stringify({ to, subject, text }, null, 2),
      { mode: 0o600 },
    );
  }
}
