import nodemailer from 'nodemailer';
import net from 'net';
import { resolveSafeHost } from '../security/ssrf';

const DEFAULT_HOST = process.env.SMTP_HOST || '';
const DEFAULT_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const DEFAULT_USER = process.env.SMTP_USER || '';
const DEFAULT_PASS = process.env.SMTP_PASS || '';
const DEFAULT_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || '';
const DEFAULT_TO = process.env.SMTP_TO || '';

export async function sendEmailMessage(
  message: string,
  options?: { host?: string; port?: number; user?: string; pass?: string; from?: string; to?: string }
): Promise<{ success: boolean; error?: string }> {
  const host = options?.host || DEFAULT_HOST;
  const port = options?.port || DEFAULT_PORT;
  const user = options?.user || DEFAULT_USER;
  const pass = options?.pass || DEFAULT_PASS;
  const from = options?.from || DEFAULT_FROM || user;
  const to = options?.to || DEFAULT_TO;

  if (!host) {
    return { success: false, error: 'SMTP 服务器地址未配置' };
  }
  if (!user || !pass) {
    return { success: false, error: 'SMTP 账号或密码未配置' };
  }
  if (!to) {
    return { success: false, error: '收件邮箱未配置' };
  }

  try {
    // SMTP 地址同样由用户提供，不校验就是一条内网端口探测通道。
    // nodemailer 自带的 allowInternalNetworkInterfaces 只按本机网卡族过滤，
    // 且 host 为字面量 IP 时会完全跳过解析，挡不住这里的场景，所以自己来。
    //
    // 先解析并校验全部地址，再把连接钉在已确认安全的那个 IP 上，
    // 避免解析与建连之间被重新绑定到内网。
    let address: string;
    try {
      ({ address } = await resolveSafeHost(host));
    } catch (err: any) {
      return { success: false, error: err.message || 'SMTP 服务器地址不可用' };
    }

    const transporter = nodemailer.createTransport({
      host: address,
      port,
      secure: port === 465,
      auth: { user, pass },
      // 连接目标是 IP，证书校验仍要按原始域名进行
      tls: net.isIP(host) ? undefined : { servername: host },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000
    });

    const subject = '📋 事项提醒';
    const textBody = message.replace(/<[^>]+>/g, '');

    await transporter.sendMail({
      from,
      to,
      subject,
      text: textBody,
      html: message.replace(/\n/g, '<br>')
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || '邮件发送失败' };
  }
}
