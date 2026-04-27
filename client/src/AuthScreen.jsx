import React, { useState } from 'react';

// ============================================================
// Auth Screen — Login / Register
// ============================================================
export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '操作失败');
        return;
      }
      onAuth(data.token, data.username);
    } catch {
      setError('无法连接到服务器');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0f14 0%, #1a1e2a 50%, #0d0f14 100%)',
      color: '#e8eaf0', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 20
    }}>
      <div style={{
        background: 'rgba(26,30,42,0.9)', border: '1px solid #2a2e3e',
        borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 380,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚔</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
            Idle Chronicles
          </h1>
          <p style={{ color: '#6b7290', fontSize: 13, marginTop: 6 }}>
            自动挂机 · 无尽冒险
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#8890a8', marginBottom: 6 }}>
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="输入用户名..."
              maxLength={20}
              autoFocus
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                background: '#0d0f14', border: '1px solid #2a2e3e', borderRadius: 8,
                color: '#e8eaf0', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#8890a8', marginBottom: 6 }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入密码..."
              maxLength={50}
              style={{
                width: '100%', padding: '10px 14px', fontSize: 14,
                background: '#0d0f14', border: '1px solid #2a2e3e', borderRadius: 8,
                color: '#e8eaf0', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#e04040', fontSize: 13, marginBottom: 14,
              padding: '8px 12px', background: 'rgba(224,64,64,0.1)',
              borderRadius: 6, textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', fontSize: 15, fontWeight: 600,
              background: loading ? '#3a3e5e' : '#4a6fa5',
              border: 'none', borderRadius: 8, color: '#fff',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading ? '请稍候...' : mode === 'login' ? '登 录' : '注 册'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7290' }}>
          {mode === 'login' ? (
            <>还没有账号？{' '}
              <button onClick={() => { setMode('register'); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#4a90d9', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                注册
              </button>
            </>
          ) : (
            <>已有账号？{' '}
              <button onClick={() => { setMode('login'); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#4a90d9', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                登录
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: 11, color: '#3a3e5e', textAlign: 'center' }}>
        Idle Chronicles v1.0 — 数据保存在服务器，请记住你的账号密码
      </div>
    </div>
  );
}
