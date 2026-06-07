/**
 * UON College ERP System — Login Page
 * Split layout: branded left panel + login form right panel.
 */

import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, Shield, GraduationCap, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const FEATURES = [
  { icon: GraduationCap, text: 'Multi-programme student management' },
  { icon: TrendingUp,    text: 'Automated GPA & promotion engine' },
  { icon: Shield,        text: 'Role-based secure access control' },
]

export default function Login() {
  const { login } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      const msg = err?.response?.data?.message
        || err?.response?.data?.detail
        || 'Invalid credentials. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Left — Branding Panel */}
      <div className="login-left">
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, color: '#fff' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
            <div style={{
              width: 64, height: 64,
              background: 'linear-gradient(135deg, #C8A951, #a8893a)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Playfair Display, serif', fontWeight: 800, fontSize: 24,
              color: '#001d52',
              boxShadow: '0 8px 32px rgba(200,169,81,0.35)',
            }}>UON</div>
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
                University of Nairobi
              </div>
              <div style={{ fontSize: 13, opacity: 0.65, marginTop: 2 }}>
                Enterprise Resource Planning System
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 42, fontWeight: 700, lineHeight: 1.15,
            marginBottom: 16,
          }}>
            Manage Academic<br />
            <span style={{ color: '#C8A951' }}>Excellence.</span>
          </h1>

          <p style={{ fontSize: 16, opacity: 0.7, lineHeight: 1.7, marginBottom: 48, maxWidth: 380 }}>
            A unified platform for students, lecturers, departments, and administration
            at the University of Nairobi.
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 42, height: 42,
                  background: 'rgba(200,169,81,0.15)',
                  borderRadius: 10, border: '1px solid rgba(200,169,81,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={18} color="#C8A951" />
                </div>
                <span style={{ fontSize: 15, opacity: 0.85 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Decorative circles */}
          <div style={{
            position: 'absolute', bottom: -120, right: -80,
            width: 300, height: 300,
            border: '1px solid rgba(200,169,81,0.12)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -60, right: -30,
            width: 180, height: 180,
            border: '1px solid rgba(200,169,81,0.08)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* Right — Form Panel */}
      <div className="login-right">
        <div className="login-box">
          {/* Logo for mobile / right panel */}
          <div className="login-logo-wrap">
            <div className="login-logo">UON</div>
            <div className="login-logo-text">
              <div className="login-logo-title">UON ERP</div>
              <div className="login-logo-sub">University of Nairobi</div>
            </div>
          </div>

          <h2 className="login-heading">Sign In</h2>
          <p className="login-subheading">
            Enter your institutional email and password to continue.
          </p>

          {/* Error alert */}
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 20 }}>
              <Lock size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="form-group">
              <label className="form-label required">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute', left: 11, top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)', pointerEvents: 'none',
                  }}
                />
                <input
                  type="email"
                  className={`form-input ${error ? 'error' : ''}`}
                  style={{ paddingLeft: 36 }}
                  placeholder="you@uon.ac.ke"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label required">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute', left: 11, top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)', pointerEvents: 'none',
                  }}
                />
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`form-input ${error ? 'error' : ''}`}
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', padding: 2,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary login-submit-btn"
              disabled={loading}
            >
              {loading
                ? <><div className="spinner spinner-sm" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Signing in…</>
                : 'Sign In'
              }
            </button>
          </form>

          {/* Role hint */}
          <div style={{
            marginTop: 32, padding: '16px',
            background: 'var(--color-surface-alt)',
            borderRadius: 10, border: '1px solid var(--color-border)',
          }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Supported Roles
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['admin','student','lecturer','cod','dean','finance'].map((role) => (
                <span key={role} className={`badge badge-role-${role}`} style={{ fontSize: 10 }}>
                  {role.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          <p style={{ marginTop: 24, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            © {new Date().getFullYear()} University of Nairobi. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}