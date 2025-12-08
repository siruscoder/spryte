import { Routes, Route, Navigate } from 'react-router-dom'
import { ExternalLayout, InternalLayout } from './layouts'
import { Landing, Login, Register, Dashboard, Profile, Settings } from './pages'
import { ProtectedRoute } from './components'
import { useAuthStore } from './stores'

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  
  // If already authenticated, redirect to app
  if (isAuthenticated) {
    return <Navigate to="/app" replace />
  }
  
  return children
}

export default function App() {
  return (
    <Routes>
      {/* External (public) routes */}
      <Route element={<ExternalLayout />}>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Landing />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
      </Route>

      {/* Internal (protected) routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <InternalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
