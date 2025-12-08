import { useState } from 'react'
import {
  Lock,
  Save,
  AlertCircle,
  CheckCircle,
  Palette,
  Bot,
} from 'lucide-react'
import { useAuthStore } from '../stores'

export default function Settings() {
  const { user, changePassword, updateSettings, isLoading, error, clearError } =
    useAuthStore()

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  // Settings state
  const [theme, setTheme] = useState(user?.settings?.theme || 'light')
  const [aiProvider, setAiProvider] = useState(
    user?.settings?.ai_provider || 'openai'
  )
  const [settingsSuccess, setSettingsSuccess] = useState('')

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    clearError()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters')
      return
    }

    try {
      await changePassword(currentPassword, newPassword)
      setPasswordSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message)
    }
  }

  const handleSettingsSave = async () => {
    clearError()
    setSettingsSuccess('')

    try {
      await updateSettings({ theme, ai_provider: aiProvider })
      setSettingsSuccess('Settings saved successfully')
    } catch (err) {
      // Error handled by store
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Preferences */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Preferences
          </h2>

          {settingsSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{settingsSuccess}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="theme" className="label">
                Theme
              </label>
              <select
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="input"
              >
                <option value="light">Light</option>
                <option value="dark">Dark (coming soon)</option>
              </select>
            </div>

            <div>
              <label htmlFor="aiProvider" className="label flex items-center gap-2">
                <Bot className="w-4 h-4" />
                AI Provider
              </label>
              <select
                id="aiProvider"
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="input"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic" disabled>
                  Anthropic (coming soon)
                </option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose which AI provider to use for text transformations
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSettingsSave}
                disabled={isLoading}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save preferences
              </button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </h2>

          {(passwordError || error) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{passwordError || error}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{passwordSuccess}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="label">
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="label">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {isLoading ? 'Changing...' : 'Change password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
