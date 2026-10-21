import { useState, type FormEvent } from "react";
import { useResourceRefresh } from "@/hooks/useResourceRefresh";
import { PageShell } from "@/components/ui/PageShell/PageShell";
import { AccountNav } from "../AccountNav/AccountNav";
import {
  saveAddress,
  removeAddress,
  type Address,
  type AddressInput,
} from "@/services/account";
import localStyles from "./Addresses.module.scss";
import sharedStyles from "@/styles/common.module.scss";
import { mergeStyles } from "@/lib/mergeStyles";
const s = mergeStyles(sharedStyles, localStyles);
const empty: AddressInput = {
  recipient: "",
  phone: "",
  province: "",
  district: "",
  address: "",
  isDefault: false,
};
export function Addresses({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<AddressInput>(empty);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const { refresh } = useResourceRefresh("addresses");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await saveAddress(form, editing === "new" ? undefined : editing!);
      setEditing(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setPending(false);
    }
  }
  async function remove(id: string) {
    setPending(true);
    setError("");
    try {
      await removeAddress(id);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setPending(false);
    }
  }
  return (
    <PageShell title="收货地址" eyebrow="YOUR EVERYDAY DESTINATIONS">
      <div className={s.accountLayout}>
        <AccountNav active="/account/addresses" />
        <div>
          {error && (
            <p className={s.notice} role="alert">
              {error}
            </p>
          )}
          {editing ? (
            <form className={s.form} onSubmit={submit}>
              <fieldset disabled={pending} style={{ border: 0, padding: 0 }}>
                <h2>{editing === "new" ? "添加地址" : "编辑地址"}</h2>
                {(
                  [
                    ["recipient", "收件人"],
                    ["phone", "联系电话"],
                    ["province", "省 / 市"],
                    ["district", "区 / 县"],
                    ["address", "详细地址"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      required
                      minLength={key === "address" ? 5 : 1}
                      maxLength={
                        key === "address" ? 200 : key === "phone" ? 30 : 60
                      }
                      type={key === "phone" ? "tel" : "text"}
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <label style={{ display: "flex", flexDirection: "row" }}>
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(e) =>
                      setForm({ ...form, isDefault: e.target.checked })
                    }
                  />
                  设为默认地址
                </label>
                <button className={s.button}>
                  {pending ? "正在保存…" : "保存地址"}
                </button>
                <button
                  type="button"
                  className={s.textButton}
                  onClick={() => setEditing(null)}
                >
                  取消
                </button>
              </fieldset>
            </form>
          ) : (
            <>
              {!addresses.length && (
                <div className={s.empty}>
                  <h2>还没有收货地址</h2>
                  <p>添加地址后，结算时可以直接选择。</p>
                </div>
              )}
              {addresses.map((address) => (
                <article className={s.address} key={address.id}>
                  {address.isDefault && (
                    <span className={s.status}>默认地址</span>
                  )}
                  <h2>{address.recipient}</h2>
                  <p>{address.phone}</p>
                  <p>
                    {address.province} · {address.district} · {address.address}
                  </p>
                  <div className={s.row}>
                    <button
                      className={s.textButton}
                      disabled={pending}
                      onClick={() => {
                        setForm({
                          recipient: address.recipient,
                          phone: address.phone,
                          province: address.province,
                          district: address.district,
                          address: address.address,
                          isDefault: address.isDefault,
                        });
                        setEditing(address.id);
                      }}
                    >
                      编辑
                    </button>
                    <button
                      className={s.textButton}
                      disabled={pending}
                      onClick={() => void remove(address.id)}
                    >
                      删除
                    </button>
                  </div>
                </article>
              ))}
              <button
                className={s.outline}
                disabled={pending || addresses.length >= 10}
                onClick={() => {
                  setForm(empty);
                  setEditing("new");
                }}
              >
                ＋ 添加地址
              </button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
