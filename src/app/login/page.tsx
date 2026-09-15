"use client";

import { useState } from "react";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { username, password }
          : { username, password, nickname };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (result?.code === 0) {
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href = next || "/";
        return;
      }
      setError(result?.msg || "操作失败");
    } catch {
      setError("网络异常，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 44 }}>🛍️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 0" }}>
            CUshop
          </h1>
          <p style={{ color: "var(--text-sub)", fontSize: 13, margin: "4px 0 0" }}>
            社区二手买卖回血 · 手作闲置好物交易
          </p>
        </div>

        <div className="nm-card" style={{ padding: 24 }}>
          {/* 切换 tab */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border-color)",
              marginBottom: 20,
            }}
          >
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: "none",
                  border: "none",
                  fontSize: 15,
                  fontWeight: mode === m ? 700 : 400,
                  color: mode === m ? "var(--nm-accent)" : "var(--text-weak)",
                  borderBottom: mode === m ? "2px solid var(--nm-accent)" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                {m === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              className="nm-input"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <input
              className="nm-input"
              type="password"
              placeholder={mode === "login" ? "密码" : "密码（至少 6 位）"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {mode === "register" && (
              <input
                className="nm-input"
                placeholder="昵称（可选，默认同用户名）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            )}

            {error && (
              <p style={{ color: "#e5484d", fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <button
              className="nm-btn-primary"
              type="submit"
              disabled={loading}
              style={{ padding: "12px 0", fontSize: 16, fontWeight: 600 }}
            >
              {loading ? "提交中…" : mode === "login" ? "登录" : "注册"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "var(--text-weak)", fontSize: 12, marginTop: 16 }}>
          首个注册的账号将自动成为管理员
        </p>
      </div>
    </div>
  );
}
