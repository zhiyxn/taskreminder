import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * 通知渠道凭据的静态加密。
 *
 * 威胁模型：防止数据库文件本身泄露后凭据直接可读——备份、快照、
 * `sqlite3 .dump`、误传的 data/ 目录等。密钥与数据库同机时，
 * 无法防御拿到完整主机权限的攻击者；要覆盖那种场景需把
 * ENCRYPTION_KEY 交给外部密钥管理服务下发。
 */

const VERSION_PREFIX = 'enc.v1.';
const IV_LENGTH = 12;      // GCM 推荐 96 bit
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;     // AES-256

/** 接口返回给前端的占位符；写回时代表"保持原值不变" */
export const SECRET_MASK = '********';

const KEY_FILE = path.resolve(__dirname, '..', '..', 'data', '.encryption-key');

function loadKey(): Buffer {
  const fromEnv = process.env.ENCRYPTION_KEY;
  if (fromEnv) {
    // 64 位十六进制视为原始密钥，其余按口令用 scrypt 派生
    if (/^[0-9a-fA-F]{64}$/.test(fromEnv)) {
      return Buffer.from(fromEnv, 'hex');
    }
    return crypto.scryptSync(fromEnv, 'taskreminder.credential.v1', KEY_LENGTH);
  }

  // 未显式配置时自动生成并落盘，保证升级部署无需人工干预。
  // 密钥与数据库同目录，只能防住"仅数据库泄露"的情形。
  try {
    if (fs.existsSync(KEY_FILE)) {
      const stored = fs.readFileSync(KEY_FILE, 'utf8').trim();
      if (/^[0-9a-fA-F]{64}$/.test(stored)) return Buffer.from(stored, 'hex');
      console.warn('⚠️  data/.encryption-key 内容不合法，将重新生成（原有凭据将无法解密）');
    }
  } catch (err) {
    console.warn('⚠️  读取加密密钥失败:', (err as Error).message);
  }

  const generated = crypto.randomBytes(KEY_LENGTH);
  const dir = path.dirname(KEY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(KEY_FILE, generated.toString('hex'), { mode: 0o600 });
  console.warn(
    '⚠️  未配置 ENCRYPTION_KEY，已自动生成 data/.encryption-key\n' +
    '    请连同数据库一起备份此文件，丢失将导致已保存的通知凭据无法解密。\n' +
    '    生产环境建议改用 ENCRYPTION_KEY 环境变量，使密钥与数据分离存放。'
  );
  return generated;
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = loadKey();
  return cachedKey;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(VERSION_PREFIX);
}

export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === '') return null;
  if (isEncrypted(plain)) return plain; // 已是密文，避免重复加密
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return VERSION_PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/**
 * 解密。未带版本前缀的值按历史明文原样返回，
 * 使迁移前后的数据都能正常读取。
 */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined || stored === '') return null;
  if (!isEncrypted(stored)) return stored;

  try {
    const raw = Buffer.from(stored.slice(VERSION_PREFIX.length), 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // 密钥变更或密文损坏。不抛出，否则整个列表接口都会挂掉；
    // 该渠道会因缺少凭据而发送失败，日志里能看到原因。
    console.error('⚠️  凭据解密失败，请确认 ENCRYPTION_KEY / data/.encryption-key 与数据库匹配');
    return null;
  }
}

/** 非空凭据一律返回固定掩码，不泄露长度等任何信息 */
export function maskSecret(value: string | null | undefined): string | null {
  return value === null || value === undefined || value === '' ? null : SECRET_MASK;
}
