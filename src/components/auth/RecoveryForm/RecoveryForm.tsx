import { useAuth } from "@/providers/AuthProvider";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/ui/PageShell/PageShell";
import { forgotPassword, resetPassword, verifyEmail } from "@/services/account";
import s from "@/styles/common.module.scss";
export default function RecoveryForm({
  mode,
  token = "",
}: {
  mode: "forgot" | "reset" | "verify";
  token?: string;
}) {
  const { refresh, setUser } = useAuth();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (mode === "reset" && form.get("password") !== form.get("confirm")) {
      setMessage("两次密码不一致");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      if (mode === "forgot") {
        await forgotPassword(String(form.get("email")));
        setMessage(
          "如果该邮箱已注册，将收到重置邮件。开发模式可按 README 查看本地邮件。",
        );
      } else if (mode === "reset") {
        await resetPassword(token, String(form.get("password")));
        setUser(null);
        refresh();
        setMessage("密码已重置，请重新登录。");
      } else {
        await verifyEmail(token);
        refresh();
        setMessage("邮箱验证成功。");
      }
      setDone(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setPending(false);
    }
  }
  return (
    <PageShell
      title={
        mode === "forgot"
          ? "找回密码"
          : mode === "reset"
            ? "设置新密码"
            : "验证邮箱"
      }
      eyebrow="YOUR LUMINA ACCOUNT"
    >
      <form
        onSubmit={submit}
        className={s.form}
        style={{ maxWidth: 460, margin: "40px auto" }}
      >
        {!done && (
          <>
            {mode === "forgot" ? (
              <label>
                注册邮箱
                <input name="email" type="email" required maxLength={120} />
              </label>
            ) : mode === "reset" ? (
              <>
                {[
                  ["password", "新密码"],
                  ["confirm", "确认新密码"],
                ].map(([name, label]) => (
                  <label key={name}>
                    {label}
                    <input
                      name={name}
                      type="password"
                      minLength={8}
                      maxLength={128}
                      required
                      autoComplete="new-password"
                    />
                  </label>
                ))}
              </>
            ) : (
              <p>确认验证你的邮箱。</p>
            )}
            <button
              className={s.button}
              disabled={
                pending || ((mode === "reset" || mode === "verify") && !token)
              }
            >
              {pending ? "正在处理…" : "确认"}
            </button>
          </>
        )}
        {message && (
          <p className={s.notice} role="status">
            {message}
          </p>
        )}
        <Link to="/login" className={s.inlineLink}>
          返回登录 →
        </Link>
      </form>
    </PageShell>
  );
}
