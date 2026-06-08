import { useState, useEffect } from 'react'
import { User, Edit2, Save, X, Mail, Phone, MapPin, Calendar, BookOpen, Hash } from 'lucide-react'
import { studentsAPI, authAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function MyProfile() {
  const { user, updateUser } = useAuth()
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [form,    setForm]       = useState({})

  useEffect(() => {
    if (!user) return
    studentsAPI.list({ search: user.email })
      .then((d) => {
        const list = Array.isArray(d) ? d : d?.results || []
        const me   = list[0] || null
        setProfile(me)
        setForm({
          first_name: user.first_name || '',
          last_name:  user.last_name  || '',
          phone:      user.phone      || '',
          county:     me?.county      || '',
          guardian_name:     me?.guardian_name     || '',
          guardian_phone:    me?.guardian_phone    || '',
          guardian_relationship: me?.guardian_relationship || '',
        })
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [user])

  const save = async () => {
    setSaving(true)
    try {
      await authAPI.updateMe({ first_name: form.first_name, last_name: form.last_name, phone: form.phone })
      if (profile?.id) {
        await studentsAPI.patch(profile.id, {
          county: form.county,
          guardian_name: form.guardian_name,
          guardian_phone: form.guardian_phone,
          guardian_relationship: form.guardian_relationship,
        })
      }
      updateUser({ first_name: form.first_name, last_name: form.last_name, phone: form.phone })
      toast.success('Profile updated.')
      setEditing(false)
    } catch { toast.error('Failed to update profile.') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">View and update your personal information.</p>
        </div>
        {!editing
          ? <button className="btn btn-outline" onClick={() => setEditing(true)}><Edit2 size={15}/> Edit Profile</button>
          : <div style={{display:'flex',gap:'var(--sp-2)'}}>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}><X size={15}/> Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><div className="spinner spinner-sm"/> Saving…</> : <><Save size={15}/> Save</>}
              </button>
            </div>
        }
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--sp-4)'}}>
        {/* Personal Details */}
        <div className="card card-padded">
          <h3 style={{fontFamily:'var(--font-display)', fontSize:'var(--text-lg)', marginBottom:'var(--sp-5)'}}>
            Personal Details
          </h3>
          {editing ? (
            <div className="form-grid">
              {[['first_name','First Name'],['last_name','Last Name'],['phone','Phone Number']].map(([k,l]) => (
                <div key={k} className="form-group">
                  <label className="form-label">{l}</label>
                  <input className="form-input" value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
          ) : (
            <div className="info-grid">
              {[
                {label:'Full Name',  value:`${user?.first_name} ${user?.last_name}`, icon:User},
                {label:'Email',      value:user?.email,  icon:Mail},
                {label:'Phone',      value:user?.phone || '—', icon:Phone},
                {label:'Gender',     value:profile?.gender_display || '—', icon:User},
                {label:'Date of Birth', value:profile?.date_of_birth || '—', icon:Calendar},
                {label:'County',     value:profile?.county || '—', icon:MapPin},
              ].map(({label,value,icon:Icon}) => (
                <div key={label} className="info-item">
                  <div className="info-label">{label}</div>
                  <div className="info-value">{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Academic Details */}
        <div className="card card-padded">
          <h3 style={{fontFamily:'var(--font-display)', fontSize:'var(--text-lg)', marginBottom:'var(--sp-5)'}}>
            Academic Details
          </h3>
          <div className="info-grid">
            {[
              {label:'Reg. Number',   value:profile?.reg_number || '—'},
              {label:'Programme',     value:profile?.programme_name || '—'},
              {label:'Programme Code',value:profile?.programme_code || '—'},
              {label:'Intake',        value:profile?.intake_name || '—'},
              {label:'Year of Study', value:`Year ${profile?.current_year_of_study || 1}`},
              {label:'Semester',      value:`Semester ${profile?.current_semester_number || 1}`},
              {label:'Status',        value:profile?.status_display || '—'},
              {label:'Sponsor',       value:profile?.sponsor_display || '—'},
              {label:'Admission Date',value:profile?.admission_date || '—'},
              {label:'Cumulative GPA',value:Number(profile?.cumulative_gpa || 0).toFixed(2)},
            ].map(({label,value}) => (
              <div key={label} className="info-item">
                <div className="info-label">{label}</div>
                <div className="info-value">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Guardian Info */}
        <div className="card card-padded">
          <h3 style={{fontFamily:'var(--font-display)', fontSize:'var(--text-lg)', marginBottom:'var(--sp-5)'}}>
            Guardian / Next of Kin
          </h3>
          {editing ? (
            <div className="form-grid">
              {[['guardian_name','Guardian Name'],['guardian_phone','Guardian Phone'],['guardian_relationship','Relationship']].map(([k,l]) => (
                <div key={k} className="form-group">
                  <label className="form-label">{l}</label>
                  <input className="form-input" value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
          ) : (
            <div className="info-grid">
              {[
                {label:'Name',         value:profile?.guardian_name  || '—'},
                {label:'Phone',        value:profile?.guardian_phone || '—'},
                {label:'Relationship', value:profile?.guardian_relationship || '—'},
              ].map(({label,value}) => (
                <div key={label} className="info-item">
                  <div className="info-label">{label}</div>
                  <div className="info-value">{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* National ID */}
        <div className="card card-padded">
          <h3 style={{fontFamily:'var(--font-display)', fontSize:'var(--text-lg)', marginBottom:'var(--sp-5)'}}>
            Identification
          </h3>
          <div className="info-grid">
            {[
              {label:'National ID',  value:profile?.national_id  || '—'},
              {label:'Username',     value:user?.username || '—'},
            ].map(({label,value}) => (
              <div key={label} className="info-item">
                <div className="info-label">{label}</div>
                <div className="info-value" style={{fontFamily:'var(--font-mono)'}}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}