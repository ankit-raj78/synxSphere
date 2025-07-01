'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, Music, Zap, Target, Settings, Bot, Check, X } from 'lucide-react'
import { AIService } from '@/lib/ai-service'

interface UserPreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  onPreferencesSaved?: () => void
}

const UserPreferencesModal: React.FC<UserPreferencesModalProps> = ({
  isOpen,
  onClose,
  userId,
  onPreferencesSaved
}) => {
  const [preferences, setPreferences] = useState({
    preferred_genres: [] as string[],
    preferred_tempo_range: [80, 140] as [number, number],
    energy_range: [0.3, 0.8] as [number, number],
    discovery_mode: true
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const musicGenres = [
    'Electronic', 'Jazz', 'Rock', 'Pop', 'Classical', 'Hip Hop',
    'R&B', 'Folk', 'Blues', 'Reggae', 'Metal', 'Punk',
    'Ambient', 'House', 'Techno', 'Dubstep', 'Indie', 'Country'
  ]

  useEffect(() => {
    if (isOpen && userId) {
      loadPreferences()
    }
  }, [isOpen, userId])

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const userPrefs = await AIService.getUserPreferences(userId)
      if (userPrefs) {
        setPreferences({
          preferred_genres: userPrefs.genre_preferences || [],
          preferred_tempo_range: userPrefs.tempo_range || [80, 140],
          energy_range: userPrefs.energy_range || [0.3, 0.8],
          discovery_mode: userPrefs.discovery_mode ?? true
        })
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    setMessage('')
    
    try {
      const success = await AIService.updateUserPreferences(userId, {
        genre_preferences: preferences.preferred_genres,
        tempo_range: preferences.preferred_tempo_range,
        energy_range: preferences.energy_range,
        discovery_mode: preferences.discovery_mode
      })

      if (success) {
        setMessage('Preferences saved successfully!')
        setTimeout(() => {
          onPreferencesSaved?.()
          onClose()
        }, 1500)
      } else {
        setMessage('Failed to save preferences. Please try again.')
      }
    } catch (error) {
      setMessage('Error saving preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleGenre = (genre: string) => {
    setPreferences(prev => ({
      ...prev,
      preferred_genres: prev.preferred_genres.includes(genre)
        ? prev.preferred_genres.filter(g => g !== genre)
        : [...prev.preferred_genres, genre]
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-bold">AI Music Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Musical Genres */}
            <div>
              <label className="block text-sm font-medium mb-3">
                <Music className="w-4 h-4 inline mr-2" />
                Preferred Genres
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {musicGenres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`p-2 rounded-lg text-sm transition-all ${
                      preferences.preferred_genres.includes(genre)
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Select genres you enjoy. This helps us recommend better room matches.
              </p>
            </div>

            {/* Tempo Range */}
            <div>
              <label className="block text-sm font-medium mb-3">
                <Zap className="w-4 h-4 inline mr-2" />
                Preferred Tempo Range (BPM)
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min="60"
                    max="200"
                    value={preferences.preferred_tempo_range[0]}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      preferred_tempo_range: [parseInt(e.target.value), prev.preferred_tempo_range[1]]
                    }))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-400">
                    Min: {preferences.preferred_tempo_range[0]} BPM
                  </div>
                </div>
                <div className="flex-1">
                  <input
                    type="range"
                    min="60"
                    max="200"
                    value={preferences.preferred_tempo_range[1]}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      preferred_tempo_range: [prev.preferred_tempo_range[0], parseInt(e.target.value)]
                    }))}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-gray-400">
                    Max: {preferences.preferred_tempo_range[1]} BPM
                  </div>
                </div>
              </div>
            </div>

            {/* Energy Range */}
            <div>
              <label className="block text-sm font-medium mb-3">
                <Target className="w-4 h-4 inline mr-2" />
                Energy Level Preference
              </label>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">Chill</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={preferences.energy_range[0]}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    energy_range: [parseFloat(e.target.value), prev.energy_range[1]]
                  }))}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={preferences.energy_range[1]}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    energy_range: [prev.energy_range[0], parseFloat(e.target.value)]
                  }))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-400">Energetic</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Range: {Math.round(preferences.energy_range[0] * 100)}% - {Math.round(preferences.energy_range[1] * 100)}%
              </p>
            </div>

            {/* Discovery Mode */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.discovery_mode}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    discovery_mode: e.target.checked
                  }))}
                  className="w-4 h-4 text-primary-500 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium">Discovery Mode</span>
                  <p className="text-xs text-gray-400">
                    Allow AI to suggest rooms outside your usual preferences to discover new music styles.
                  </p>
                </div>
              </label>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.includes('success') 
                  ? 'bg-green-500/20 text-green-300' 
                  : 'bg-red-500/20 text-red-300'
              }`}>
                {message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={savePreferences}
                disabled={saving}
                className="flex-1 btn-primary flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Preferences</span>
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default UserPreferencesModal
