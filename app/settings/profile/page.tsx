'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'

interface ProfileData {
  name: string
  email: string
  phone: string
  avatarUrl?: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    name: 'Hunter Thompson',
    email: 'user@example.com',
    phone: '+1 (424) 515-7194',
    avatarUrl: undefined,
  })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    setSaving(true)
    // TODO: API call to update profile
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfile({ ...profile, avatarUrl: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 5000)
      return
    }
    // TODO: API call to delete account
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      alert('Account deletion request submitted. You will receive a confirmation email.')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold hidden lg:block">Profile</h2>
        <p className="text-text-secondary mt-1 hidden lg:block">
          Manage your personal information
        </p>
      </div>

      {/* Avatar Upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="block text-sm font-medium mb-2">Profile Picture</label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-surface-elevated flex items-center justify-center overflow-hidden border-2 border-gray-700">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl">👤</span>
            )}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium"
            >
              Upload Photo
            </button>
            <p className="text-text-secondary text-xs">JPG or PNG, max 5MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </motion.div>

      {/* Name */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
          placeholder="Enter your name"
        />
      </motion.div>

      {/* Email */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={profile.email}
          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
          placeholder="your@email.com"
        />
        <p className="text-text-secondary text-sm mt-2">
          Used for account recovery and important notifications
        </p>
      </motion.div>

      {/* Phone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <label htmlFor="phone" className="block text-sm font-medium mb-2">
          Phone Number <span className="text-text-secondary font-normal">(optional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={profile.phone}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          className="w-full px-4 py-3 bg-background border border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
          placeholder="+1 (555) 000-0000"
        />
        <p className="text-text-secondary text-sm mt-2">
          For SMS notifications and two-factor authentication
        </p>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-4"
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary text-background rounded-lg hover:bg-primary/90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="pt-8 border-t border-gray-700"
      >
        <h3 className="text-lg font-semibold text-danger mb-4">Danger Zone</h3>
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-medium mb-1">Delete Account</h4>
              <p className="text-text-secondary text-sm">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                deleteConfirm
                  ? 'bg-danger text-white hover:bg-danger/90'
                  : 'border border-danger text-danger hover:bg-danger/10'
              }`}
            >
              {deleteConfirm ? 'Confirm Delete' : 'Delete Account'}
            </button>
          </div>
          {deleteConfirm && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-warning text-sm mt-3"
            >
              Click again to confirm deletion. This will expire in 5 seconds.
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
