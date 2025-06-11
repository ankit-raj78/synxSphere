'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Music, Users, Globe, Lock, Settings, Plus, 
  Music2, Music3, Mic, Headphones, Volume2 
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RoomCreationProps {
  onRoomCreated?: (roomId: string) => void
}

export default function RoomCreation({ onRoomCreated }: RoomCreationProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    genre: 'Electronic',
    isPublic: true,
    maxParticipants: 6,
    instruments: [] as string[],
    experienceLevel: 'intermediate',
    tempoRange: [80, 140] as [number, number]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const genres = [
    'Electronic', 'Rock', 'Pop', 'Hip Hop', 'Jazz', 'Classical', 
    'R&B', 'Country', 'Reggae', 'Blues', 'Folk', 'Alternative'
  ]

  const instruments = [
    { name: 'Guitar', icon: Music2 },
    { name: 'Piano', icon: Music3 },
    { name: 'Vocals', icon: Mic },
    { name: 'Bass', icon: Volume2 },
    { name: 'Drums', icon: Headphones },
    { name: 'Synthesizer', icon: Music3 },
    { name: 'Violin', icon: Music },
    { name: 'Saxophone', icon: Music }
  ]

  const handleInstrumentToggle = (instrument: string) => {
    setFormData(prev => ({
      ...prev,
      instruments: prev.instruments.includes(instrument)
        ? prev.instruments.filter(i => i !== instrument)
        : [...prev.instruments, instrument]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const room = await response.json()
        if (onRoomCreated) {
          onRoomCreated(room.id)
        } else {
          router.push(`/room/${room.id}`)
        }
      } else {
        const error = await response.json()
        console.error('Error creating room:', error)
      }
    } catch (error) {
      console.error('Error creating room:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8"
      >
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Create Music Room
            </h2>
            <p className="text-gray-400">Set up your collaborative music space</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Room Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                placeholder="e.g., Chill Vibes Session"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Genre</label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              >
                {genres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              placeholder="Describe your music room and what you're looking to create together..."
              required
            />
          </div>

          {/* Room Settings */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Room Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-3">Privacy</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border transition-colors ${
                      formData.isPublic 
                        ? 'bg-purple-600 border-purple-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border transition-colors ${
                      !formData.isPublic 
                        ? 'bg-purple-600 border-purple-500 text-white' 
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Participants</label>
                <select
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                >
                  {[2, 4, 6, 8, 10, 12].map(num => (
                    <option key={num} value={num}>{num} people</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Musical Preferences */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Musical Preferences</h3>
            
            <div>
              <label className="block text-sm font-medium mb-3">Welcome Instruments</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {instruments.map(instrument => {
                  const IconComponent = instrument.icon
                  return (
                    <button
                      key={instrument.name}
                      type="button"
                      onClick={() => handleInstrumentToggle(instrument.name)}
                      className={`flex items-center space-x-2 py-3 px-4 rounded-lg border transition-colors ${
                        formData.instruments.includes(instrument.name)
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="text-sm">{instrument.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Experience Level</label>
              <select
                value={formData.experienceLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, experienceLevel: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
              >
                <option value="beginner">Beginner Friendly</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="mixed">Mixed Levels</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tempo Range (BPM)</label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  min="60"
                  max="200"
                  value={formData.tempoRange[0]}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    tempoRange: [parseInt(e.target.value), prev.tempoRange[1]]
                  }))}
                  className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="number"
                  min="60"
                  max="200"
                  value={formData.tempoRange[1]}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    tempoRange: [prev.tempoRange[0], parseInt(e.target.value)]
                  }))}
                  className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.description}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Room</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
