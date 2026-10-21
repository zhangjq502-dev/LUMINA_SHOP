import { login, register as registerAccount } from "@/services/auth";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/ui/PageShell/PageShell";
import localStyles from "./LoginForm.module.scss";
import sharedStyles from "@/styles/common.module.scss";
import { mergeStyles } from "@/lib/mergeStyles";
const s = mergeStyles(sharedStyles, localStyles);
export default function LoginForm() {
  const [register, setRegister] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { refresh, setUser } = useAuth();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (register && password !== form.get("confirm")) {
      setError("两次输入的密码不一致");
      return;
    }
    setPending(true);
    setError("");
    try {
      const body = {
        email: String(form.get("email")).trim(),
        password,
        ...(register ? { name: String(form.get("name")).trim() } : {}),
      };
      const result = register
        ? await registerAccount({
            ...body,
            name: String(form.get("name")).trim(),
          })
        : await login({ email: body.email, password });
      setUser(result.user);
      navigate("/account", { replace: true });
      refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "网络异常，请重试");
      setPending(false);
    }
  }
  return (
    <PageShell
      title={register ? "创建账户" : "欢迎回来"}
      eyebrow="YOUR WORLD, A LITTLE LIGHTER"
    >
      <div className={s.auth}>
        <div className={s.authArt}>
          <span>✳</span>
          <h2>
            Less noise.
            <br />
            More you.
          </h2>
          <p>简单的选择，长久的喜欢。</p>
        </div>
        <div className={s.authForm}>
          <div className={s.tabs}>
            {[false, true].map((value) => (
              <button
                key={String(value)}
                disabled={pending}
                className={register === value ? s.active : ""}
                onClick={() => {
                  setRegister(value);
                  setError("");
                }}
              >
                {value ? "注册" : "登录"}
              </button>
            ))}
          </div>
          <p className={s.muted}>
            {register
              ? "创建你的 LUMINA 账户，保存订单与日常灵感。"
              : "登录后查看你的订单，继续探索日常好物。"}
          </p>
          <form key={String(register)} className={s.form} onSubmit={submit}>
            <fieldset
              disabled={pending}
              style={{ border: 0, padding: 0, margin: 0 }}
            >
              {register && (
                <label>
                  昵称
                  <input
                    name="name"
                    required
                    maxLength={40}
                    autoComplete="nickname"
                    placeholder="你的昵称"
                  />
                </label>
              )}
              <label>
                邮箱
                <input
                  name="email"
                  required
                  type="email"
                  maxLength={120}
                  autoComplete="username"
                  placeholder="you@example.com"
                />
              </label>
              <label>
                密码
                <input
                  name="password"
                  required
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete={register ? "new-password" : "current-password"}
                  placeholder="8–128 位密码"
                />
              </label>
              {register && (
                <label>
                  确认密码
                  <input
                    name="confirm"
                    required
                    type="password"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="再次输入密码"
                  />
                </label>
              )}
              {error && (
                <p role="alert" className={s.notice}>
                  {error}
                </p>
              )}
              <button className={s.button} disabled={pending}>
                {pending ? "正在处理…" : register ? "创建账户 ↗" : "登录 ↗"}
              </button>
            </fieldset>
          </form>
          <Link to="/forgot-password" className={s.inlineLink}>
            忘记密码？
          </Link>
          <Link to="/shop" className={s.inlineLink}>
            以访客身份继续浏览 →
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
