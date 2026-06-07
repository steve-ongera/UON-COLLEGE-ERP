/**
 * UON College ERP System — API Service Layer
 * Axios instance with JWT interceptors + all API call functions.
 */

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ─────────────────────────────────────────────────────────
// AXIOS INSTANCE
// ─────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Request interceptor — attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — auto-refresh on 401
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`
            return api(original)
          })
          .catch((err) => Promise.reject(err))
      }

      original._retry = true
      isRefreshing     = true

      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) {
        isRefreshing = false
        _forceLogout()
        return Promise.reject(error)
      }

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh })
        const newAccess = res.data?.data?.access || res.data?.access
        localStorage.setItem('access_token', newAccess)
        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`
        processQueue(null, newAccess)
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      } catch (err) {
        processQueue(err, null)
        _forceLogout()
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

const _forceLogout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('uon_user')
  window.location.href = '/login'
}

// ─────────────────────────────────────────────────────────
// HELPER — unwrap response data
// ─────────────────────────────────────────────────────────
const unwrap = (res) => res.data?.data ?? res.data

// ─────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────
export const authAPI = {
  login:   (email, password) =>
    api.post('/auth/login/', { email, password }).then(unwrap),

  logout:  (refresh) =>
    api.post('/auth/logout/', { refresh }).then(unwrap),

  refresh: (refresh) =>
    api.post('/auth/refresh/', { refresh }).then(unwrap),

  me: () =>
    api.get('/auth/me/').then(unwrap),

  updateMe: (data) =>
    api.put('/auth/me/', data).then(unwrap),

  changePassword: (data) =>
    api.post('/auth/me/change-password/', data).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────
export const dashboardAPI = {
  get: () => api.get('/dashboard/').then(unwrap),
}

// ─────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────
export const usersAPI = {
  list:           (params) => api.get('/users/', { params }).then(unwrap),
  get:            (id)     => api.get(`/users/${id}/`).then(unwrap),
  create:         (data)   => api.post('/users/', data).then(unwrap),
  update:         (id, data) => api.put(`/users/${id}/`, data).then(unwrap),
  patch:          (id, data) => api.patch(`/users/${id}/`, data).then(unwrap),
  delete:         (id)     => api.delete(`/users/${id}/`).then(unwrap),
  activate:       (id)     => api.post(`/users/${id}/activate/`).then(unwrap),
  deactivate:     (id)     => api.post(`/users/${id}/deactivate/`).then(unwrap),
  resetPassword:  (id, data) => api.post(`/users/${id}/reset-password/`, data).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// FACULTIES
// ─────────────────────────────────────────────────────────
export const facultiesAPI = {
  list:        (params) => api.get('/faculties/', { params }).then(unwrap),
  get:         (id)     => api.get(`/faculties/${id}/`).then(unwrap),
  create:      (data)   => api.post('/faculties/', data).then(unwrap),
  update:      (id, data) => api.put(`/faculties/${id}/`, data).then(unwrap),
  delete:      (id)     => api.delete(`/faculties/${id}/`).then(unwrap),
  departments: (id)     => api.get(`/faculties/${id}/departments/`).then(unwrap),
  programmes:  (id)     => api.get(`/faculties/${id}/programmes/`).then(unwrap),
  stats:       (id)     => api.get(`/faculties/${id}/stats/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────
export const departmentsAPI = {
  list:        (params) => api.get('/departments/', { params }).then(unwrap),
  get:         (id)     => api.get(`/departments/${id}/`).then(unwrap),
  create:      (data)   => api.post('/departments/', data).then(unwrap),
  update:      (id, data) => api.put(`/departments/${id}/`, data).then(unwrap),
  delete:      (id)     => api.delete(`/departments/${id}/`).then(unwrap),
  lecturers:   (id)     => api.get(`/departments/${id}/lecturers/`).then(unwrap),
  programmes:  (id)     => api.get(`/departments/${id}/programmes/`).then(unwrap),
  students:    (id)     => api.get(`/departments/${id}/students/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// PROGRAMMES
// ─────────────────────────────────────────────────────────
export const programmesAPI = {
  list:          (params) => api.get('/programmes/', { params }).then(unwrap),
  get:           (id)     => api.get(`/programmes/${id}/`).then(unwrap),
  create:        (data)   => api.post('/programmes/', data).then(unwrap),
  update:        (id, data) => api.put(`/programmes/${id}/`, data).then(unwrap),
  delete:        (id)     => api.delete(`/programmes/${id}/`).then(unwrap),
  units:         (id, params) => api.get(`/programmes/${id}/units/`, { params }).then(unwrap),
  addUnit:       (id, data)   => api.post(`/programmes/${id}/add-unit/`, data).then(unwrap),
  students:      (id, params) => api.get(`/programmes/${id}/students/`, { params }).then(unwrap),
  feeStructures: (id, params) => api.get(`/programmes/${id}/fee-structures/`, { params }).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// ACADEMIC YEARS
// ─────────────────────────────────────────────────────────
export const academicYearsAPI = {
  list:       (params) => api.get('/academic-years/', { params }).then(unwrap),
  get:        (id)     => api.get(`/academic-years/${id}/`).then(unwrap),
  create:     (data)   => api.post('/academic-years/', data).then(unwrap),
  update:     (id, data) => api.put(`/academic-years/${id}/`, data).then(unwrap),
  delete:     (id)     => api.delete(`/academic-years/${id}/`).then(unwrap),
  setCurrent: (id)     => api.post(`/academic-years/${id}/set-current/`).then(unwrap),
  current:    ()       => api.get('/academic-years/current/').then(unwrap),
}

// ─────────────────────────────────────────────────────────
// INTAKES
// ─────────────────────────────────────────────────────────
export const intakesAPI = {
  list:   (params) => api.get('/intakes/', { params }).then(unwrap),
  get:    (id)     => api.get(`/intakes/${id}/`).then(unwrap),
  create: (data)   => api.post('/intakes/', data).then(unwrap),
  update: (id, data) => api.put(`/intakes/${id}/`, data).then(unwrap),
  delete: (id)     => api.delete(`/intakes/${id}/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// SEMESTERS
// ─────────────────────────────────────────────────────────
export const semestersAPI = {
  list:       (params) => api.get('/semesters/', { params }).then(unwrap),
  get:        (id)     => api.get(`/semesters/${id}/`).then(unwrap),
  create:     (data)   => api.post('/semesters/', data).then(unwrap),
  update:     (id, data) => api.put(`/semesters/${id}/`, data).then(unwrap),
  delete:     (id)     => api.delete(`/semesters/${id}/`).then(unwrap),
  setCurrent: (id)     => api.post(`/semesters/${id}/set-current/`).then(unwrap),
  current:    ()       => api.get('/semesters/current/').then(unwrap),
}

// ─────────────────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────────────────
export const studentsAPI = {
  list:        (params) => api.get('/students/', { params }).then(unwrap),
  get:         (id)     => api.get(`/students/${id}/`).then(unwrap),
  create:      (data)   => api.post('/students/', data).then(unwrap),
  update:      (id, data) => api.put(`/students/${id}/`, data).then(unwrap),
  patch:       (id, data) => api.patch(`/students/${id}/`, data).then(unwrap),
  delete:      (id)     => api.delete(`/students/${id}/`).then(unwrap),
  results:     (id)     => api.get(`/students/${id}/results/`).then(unwrap),
  fees:        (id)     => api.get(`/students/${id}/fees/`).then(unwrap),
  timetable:   (id)     => api.get(`/students/${id}/timetable/`).then(unwrap),
  enrollments: (id, params) => api.get(`/students/${id}/enrollments/`, { params }).then(unwrap),
  promote:     (id, data)   => api.post(`/students/${id}/promote/`, data).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// LECTURERS
// ─────────────────────────────────────────────────────────
export const lecturersAPI = {
  list:     (params) => api.get('/lecturers/', { params }).then(unwrap),
  get:      (id)     => api.get(`/lecturers/${id}/`).then(unwrap),
  create:   (data)   => api.post('/lecturers/', data).then(unwrap),
  update:   (id, data) => api.put(`/lecturers/${id}/`, data).then(unwrap),
  delete:   (id)     => api.delete(`/lecturers/${id}/`).then(unwrap),
  units:    (id, params) => api.get(`/lecturers/${id}/units/`, { params }).then(unwrap),
  schedule: (id)     => api.get(`/lecturers/${id}/schedule/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// UNITS
// ─────────────────────────────────────────────────────────
export const unitsAPI = {
  list:   (params) => api.get('/units/', { params }).then(unwrap),
  get:    (id)     => api.get(`/units/${id}/`).then(unwrap),
  create: (data)   => api.post('/units/', data).then(unwrap),
  update: (id, data) => api.put(`/units/${id}/`, data).then(unwrap),
  delete: (id)     => api.delete(`/units/${id}/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// UNIT OFFERINGS
// ─────────────────────────────────────────────────────────
export const offeringsAPI = {
  list:        (params) => api.get('/unit-offerings/', { params }).then(unwrap),
  get:         (id)     => api.get(`/unit-offerings/${id}/`).then(unwrap),
  create:      (data)   => api.post('/unit-offerings/', data).then(unwrap),
  update:      (id, data) => api.put(`/unit-offerings/${id}/`, data).then(unwrap),
  delete:      (id)     => api.delete(`/unit-offerings/${id}/`).then(unwrap),
  classlist:   (id)     => api.get(`/unit-offerings/${id}/classlist/`).then(unwrap),
  marks:       (id)     => api.get(`/unit-offerings/${id}/marks/`).then(unwrap),
  assessments: (id)     => api.get(`/unit-offerings/${id}/assessments/`).then(unwrap),
  results:     (id)     => api.get(`/unit-offerings/${id}/results/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// ENROLLMENTS
// ─────────────────────────────────────────────────────────
export const enrollmentsAPI = {
  list:   (params) => api.get('/enrollments/', { params }).then(unwrap),
  get:    (id)     => api.get(`/enrollments/${id}/`).then(unwrap),
  create: (data)   => api.post('/enrollments/', data).then(unwrap),
  delete: (id)     => api.delete(`/enrollments/${id}/`).then(unwrap),
  drop:   (id)     => api.post(`/enrollments/${id}/drop/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// ASSESSMENT TYPES
// ─────────────────────────────────────────────────────────
export const assessmentTypesAPI = {
  list:   (params) => api.get('/assessment-types/', { params }).then(unwrap),
  create: (data)   => api.post('/assessment-types/', data).then(unwrap),
  update: (id, data) => api.put(`/assessment-types/${id}/`, data).then(unwrap),
  delete: (id)     => api.delete(`/assessment-types/${id}/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// UNIT ASSESSMENTS
// ─────────────────────────────────────────────────────────
export const unitAssessmentsAPI = {
  list:    (params) => api.get('/unit-assessments/', { params }).then(unwrap),
  get:     (id)     => api.get(`/unit-assessments/${id}/`).then(unwrap),
  create:  (data)   => api.post('/unit-assessments/', data).then(unwrap),
  update:  (id, data) => api.put(`/unit-assessments/${id}/`, data).then(unwrap),
  delete:  (id)     => api.delete(`/unit-assessments/${id}/`).then(unwrap),
  release: (id)     => api.post(`/unit-assessments/${id}/release/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// MARKS
// ─────────────────────────────────────────────────────────
export const marksAPI = {
  list:    (params) => api.get('/marks/', { params }).then(unwrap),
  get:     (id)     => api.get(`/marks/${id}/`).then(unwrap),
  create:  (data)   => api.post('/marks/', data).then(unwrap),
  update:  (id, data) => api.put(`/marks/${id}/`, data).then(unwrap),
  bulk:    (data)   => api.post('/marks/bulk/', data).then(unwrap),
  compute: (data)   => api.post('/marks/compute/', data).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// UNIT RESULTS
// ─────────────────────────────────────────────────────────
export const unitResultsAPI = {
  list:        (params) => api.get('/unit-results/', { params }).then(unwrap),
  get:         (id)     => api.get(`/unit-results/${id}/`).then(unwrap),
  approve:     (id)     => api.post(`/unit-results/${id}/approve/`).then(unwrap),
  bulkApprove: (data)   => api.post('/unit-results/bulk-approve/', data).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// SEMESTER RESULTS
// ─────────────────────────────────────────────────────────
export const semesterResultsAPI = {
  list:        (params) => api.get('/semester-results/', { params }).then(unwrap),
  get:         (id)     => api.get(`/semester-results/${id}/`).then(unwrap),
  compute:     (data)   => api.post('/semester-results/compute/', data).then(unwrap),
  approve:     (id)     => api.post(`/semester-results/${id}/approve/`).then(unwrap),
  release:     (id)     => api.post(`/semester-results/${id}/release/`).then(unwrap),
  bulkRelease: (data)   => api.post('/semester-results/bulk-release/', data).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// PROMOTIONS
// ─────────────────────────────────────────────────────────
export const promotionsAPI = {
  list: (params) => api.get('/promotions/', { params }).then(unwrap),
  get:  (id)     => api.get(`/promotions/${id}/`).then(unwrap),
  bulk: (data)   => api.post('/promotions/bulk/', data).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// FEE STRUCTURES
// ─────────────────────────────────────────────────────────
export const feeStructuresAPI = {
  list:   (params) => api.get('/fee-structures/', { params }).then(unwrap),
  get:    (id)     => api.get(`/fee-structures/${id}/`).then(unwrap),
  create: (data)   => api.post('/fee-structures/', data).then(unwrap),
  update: (id, data) => api.put(`/fee-structures/${id}/`, data).then(unwrap),
  delete: (id)     => api.delete(`/fee-structures/${id}/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// FEE ACCOUNTS
// ─────────────────────────────────────────────────────────
export const feeAccountsAPI = {
  list:          (params) => api.get('/fee-accounts/', { params }).then(unwrap),
  get:           (id)     => api.get(`/fee-accounts/${id}/`).then(unwrap),
  updateBalance: (id)     => api.post(`/fee-accounts/${id}/update-balance/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────
export const paymentsAPI = {
  list:    (params) => api.get('/payments/', { params }).then(unwrap),
  get:     (id)     => api.get(`/payments/${id}/`).then(unwrap),
  create:  (data)   => api.post('/payments/', data).then(unwrap),
  reverse: (id)     => api.post(`/payments/${id}/reverse/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────────────────
export const invoicesAPI = {
  list:   (params) => api.get('/invoices/', { params }).then(unwrap),
  get:    (id)     => api.get(`/invoices/${id}/`).then(unwrap),
  create: (data)   => api.post('/invoices/', data).then(unwrap),
  update: (id, data) => api.put(`/invoices/${id}/`, data).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// TIMETABLE
// ─────────────────────────────────────────────────────────
export const timetableAPI = {
  list:   (params) => api.get('/timetable/', { params }).then(unwrap),
  get:    (id)     => api.get(`/timetable/${id}/`).then(unwrap),
  create: (data)   => api.post('/timetable/', data).then(unwrap),
  update: (id, data) => api.put(`/timetable/${id}/`, data).then(unwrap),
  delete: (id)     => api.delete(`/timetable/${id}/`).then(unwrap),
}

// ─────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────
export const reportsAPI = {
  enrollment: (params) => api.get('/reports/enrollment/', { params }).then(unwrap),
  results:    (params) => api.get('/reports/results/', { params }).then(unwrap),
  finance:    (params) => api.get('/reports/finance/', { params }).then(unwrap),
  graduates:  (params) => api.get('/reports/graduates/', { params }).then(unwrap),
  defaulters: (params) => api.get('/reports/defaulters/', { params }).then(unwrap),
  transcript: (studentId) =>
    api.get('/reports/transcript/', { params: { student_id: studentId } }).then(unwrap),
}

export default api