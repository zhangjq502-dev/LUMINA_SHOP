import {
  generateKeyPairSync,
  createPublicKey,
  createPrivateKey,
} from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";
const root = process.cwd(),
  envFile = resolve(root, ".env");
let text;
try {
  text = readFileSync(envFile, "utf8");
} catch {
  throw new Error("请先从 .env.example 创建本地 .env");
}
const env = parse(text);
if (process.argv.includes("--check")) {
  const required = [
    "ALIPAY_APP_ID",
    "ALIPAY_SELLER_ID",
    "ALIPAY_PRIVATE_KEY",
    "ALIPAY_PUBLIC_KEY",
    "ALIPAY_NOTIFY_URL",
  ];
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) {
    console.log("还需要填写：" + missing.join("、"));
    process.exitCode = 1;
  } else {
    try {
      const wrap = (key, label) =>
        key.includes("-----BEGIN")
          ? key.replace(/\\n/g, "\n")
          : `-----BEGIN ${label}-----\n${key}\n-----END ${label}-----`;
      createPrivateKey(wrap(env.ALIPAY_PRIVATE_KEY, "PRIVATE KEY"));
      createPublicKey(wrap(env.ALIPAY_PUBLIC_KEY, "PUBLIC KEY"));
      const notify = new URL(env.ALIPAY_NOTIFY_URL);
      if (
        notify.protocol !== "https:" ||
        notify.pathname !== "/api/payments/alipay/notify"
      )
        throw new Error();
      console.log(
        "密钥格式和回调地址格式通过；仍需在支付宝后台确认应用公钥、测试账号和外网回调可用。",
      );
      console.log(
        env.PAYMENT_MODE === "alipay"
          ? "已选择支付宝沙箱。"
          : "当前仍是模拟/其他支付；准备好后将 PAYMENT_MODE 设为 alipay 并重启后端。",
      );
    } catch {
      console.log(
        "密钥或回调地址格式有误，请按 docs/alipay-sandbox.md 检查；不会打印任何私钥。",
      );
      process.exitCode = 1;
    }
  }
} else {
  if (env.ALIPAY_PRIVATE_KEY?.trim()) {
    console.log(
      "已有应用私钥，保持原样；如需重新生成请先确认支付宝后台配置，不自动覆盖。",
    );
  } else {
    const keys = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { format: "pem", type: "pkcs8" },
      publicKeyEncoding: { format: "pem", type: "spki" },
    });
    const dir = resolve(root, "backend/.payment-keys");
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const publicContent = keys.publicKey
      .replace(/-----[^\n]+-----/g, "")
      .replace(/\s/g, "");
    writeFileSync(resolve(dir, "app-public-upload.txt"), publicContent + "\n", {
      mode: 0o600,
    });
    const line = "ALIPAY_PRIVATE_KEY=" + JSON.stringify(keys.privateKey);
    text = /^ALIPAY_PRIVATE_KEY=.*$/m.test(text)
      ? text.replace(/^ALIPAY_PRIVATE_KEY=.*$/m, () => line)
      : text + "\n" + line + "\n";
    writeFileSync(envFile, text, { mode: 0o600 });
    chmodSync(envFile, 0o600);
    console.log(
      "应用私钥已安全写入本地 .env。上传到支付宝的应用公钥：backend/.payment-keys/app-public-upload.txt",
    );
    console.log(
      "不要把应用公钥误填到 ALIPAY_PUBLIC_KEY；后者是支付宝平台提供的公钥。",
    );
  }
}
