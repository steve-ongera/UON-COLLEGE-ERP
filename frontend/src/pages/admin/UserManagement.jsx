import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, UserCheck, UserX, Edit2, Trash2, KeyRound } from 'lucide-react'
import { usersAPI } from '../../services/api'
import toast from 'react-hot-toast'

const ROLES = ['admin','student','lecturer','cod','dean','finance']

const EMPTY_FORM = { email:'', username:'', first_name:'', last_name:'', role:'student', phone:'', password:'', confirm_password:'' }

export default function UserManagement() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [roleFilter, setRole] = useState('')
  const [modal,   setModal]   = useState(null)  // null | 'create' | 'edit' | 'reset'
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [selected, setSelected] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    usersAPI.list({ search, role: roleFilter || undefined })
      .then((d) => setUsers(Array.isArray(d) ? d : d?.results || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }, [search, roleFilter])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(EMPTY_FORM); setSelected(null); setModal('create') }
  const openEdit   = (u)  => { setForm({ ...u, password: '', confirm_password: '' }); setSelected(u); setModal('edit') }
  const openReset  = (u)  => { setSelected(u); setForm({ new_password: '' }); setModal('reset') }
  const closeModal = () => { setModal(null); setSelected(null) }

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      if (modal === 'create') {
        await usersAPI.create(form)
        toast.success('User created successfully.')
      } else if (modal === 'edit') {
        await usersAPI.patch(selected.id, { first_name: form.first_name, last_name: form.last_name, role: form.role, phone: form.phone })
        toast.success('User updated.')
      } else if (modal === 'reset') {
        await usersAPI.resetPassword(selected.id, { new_password: form.new_password })
        toast.success('Password reset.')
      }
      closeModal(); load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Operation failed.')
    } finally { setSaving(false) }
  }

  const handleToggle = async (u) => {
    try {
      if (u.is_active) await usersAPI.deactivate(u.id)
      else             await usersAPI.activate(u.id)
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}.`)
      load()
    } catch { toast.error('Failed to update user status.') }
  }

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Create and manage all system user accounts and roles.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            className="form-input search-input"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: 160 }} value={roleFilter} onChange={(e) => setRole(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={load}><RefreshCw size={15} /></button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="page-loader" style={{ minHeight: 120 }}><div className="spinner" /></div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-state-title">No users found</div>
                </div>
              </td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td><span style={{ fontWeight: 500 }}>{u.first_name} {u.last_name}</span></td>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.email}</span></td>
                <td><span className={`badge badge-role-${u.role}`}>{u.role.toUpperCase()}</span></td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-icon btn-sm" onClick={() => openEdit(u)} title="Edit"><Edit2 size={14} /></button>
                    <button className="btn btn-icon btn-sm" onClick={() => openReset(u)} title="Reset Password"><KeyRound size={14} /></button>
                    <button
                      className={`btn btn-icon btn-sm`}
                      style={{ color: u.is_active ? 'var(--color-danger)' : 'var(--color-success)' }}
                      onClick={() => handleToggle(u)}
                      title={u.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                {modal === 'create' ? 'Create User' : modal === 'edit' ? 'Edit User' : 'Reset Password'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {modal !== 'reset' ? (
                <div className="form-grid">
                  {modal === 'create' && <>
                    <div className="form-group">
                      <label className="form-label required">Email</label>
                      <input name="email" className="form-input" value={form.email} onChange={handleChange} placeholder="user@uon.ac.ke" />
                    </div>
                    <div className="form-group">
                      <label className="form-label required">Username</label>
                      <input name="username" className="form-input" value={form.username} onChange={handleChange} />
                    </div>
                  </>}
                  <div className="form-group">
                    <label className="form-label required">First Name</label>
                    <input name="first_name" className="form-input" value={form.first_name} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Last Name</label>
                    <input name="last_name" className="form-input" value={form.last_name} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Role</label>
                    <select name="role" className="form-select" value={form.role} onChange={handleChange}>
                      {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input name="phone" className="form-input" value={form.phone || ''} onChange={handleChange} />
                  </div>
                  {modal === 'create' && <>
                    <div className="form-group">
                      <label className="form-label required">Password</label>
                      <input name="password" type="password" className="form-input" value={form.password} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label required">Confirm Password</label>
                      <input name="confirm_password" type="password" className="form-input" value={form.confirm_password} onChange={handleChange} />
                    </div>
                  </>}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label required">New Password for <strong>{selected?.email}</strong></label>
                  <input name="new_password" type="password" className="form-input" value={form.new_password || ''} onChange={handleChange} placeholder="Min. 8 characters" />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner spinner-sm" /> Saving…</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}