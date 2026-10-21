import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import {
  updateProfile,
  changePassword,
  sendVerification,
} from "@/services/account";
import s from "@/styles/common.module.scss";
export default function ProfileEditor() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const { refresh, setUser } = useAuth();
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setMessage("");
    try {
      await updateProfile(String(data.get("name")));
      setMessage("资料已保存");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setPending(false);
    }
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get("newPassword") !== data.get("confirm")) {
      setMessage("两次新密码不一致");
      return;
    }
    setPending(true);
    try {
      await changePassword(
        String(data.get("currentPassword")),
        String(data.get("newPassword")),
      );
      setUser(null);
      navigate("/login", { replace: true });
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "修改失败");
      setPending(false);
    }
  }
  async function verify() {
    setPending(true);
    try {
      await sendVerification();
      setMessage("验证邮件已准备，请查收。开发模式请按 README 查看本地邮件。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发送失败");
    } finally {
      setPending(false);
    }
  }
  return (
    <div>
      {message && (
        <p className={s.notice} role="status">
          {message}
        </p>
      )}
      <form className={s.form} onSubmit={save}>
        <label>
          昵称
          <input
            name="name"
            required
            maxLength={40}
            defaultValue={user?.name}
          />
        </label>
        <button className={s.outline} disabled={pending}>
          保存资料
        </button>
      </form>
      <p className={s.muted}>
        {user?.emailVerifiedAt ? "邮箱已验证" : "邮箱尚未验证"}
      </p>
      {!user?.emailVerifiedAt && (
        <button
          className={s.outline}
          disabled={pending}
          onClick={() => void verify()}
        >
          发送验证邮件
        </button>
      )}
      <details className={s.disclosure}>
        <summary>修改密码</summary>
        <form className={s.form} onSubmit={password}>
          {[
            ["currentPassword", "当前密码"],
            ["newPassword", "新密码"],
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
                autoComplete={
                  name === "currentPassword"
                    ? "current-password"
                    : "new-password"
                }
              />
            </label>
          ))}
          <button className={s.button} disabled={pending}>
            修改密码并重新登录
          </button>
        </form>
      </details>
    </div>
  );
}
