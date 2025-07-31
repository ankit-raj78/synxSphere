'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Music, Target, Award } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    instruments: [] as string[],
    genres: [] as string[],
    experience: '',
    collaborationGoals: [] as string[]
  })

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!email) return 'Email is required'
    if (!emailRegex.test(email)) return 'Please enter a valid email address'
    return ''
  }

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (!password) return 'Password is required'
    if (!minLength) return 'Password must be at least 8 characters long'
    if (!hasUpperCase) return 'Password must contain at least one uppercase letter'
    if (!hasLowerCase) return 'Password must contain at least one lowercase letter'
    if (!hasNumber) return 'Password must contain at least one number'
    if (!hasSpecialChar) return 'Password must contain at least one special character'
    return ''
  }

  const validateConfirmPassword = (password: string, confirmPassword: string) => {
    if (!confirmPassword) return 'Please confirm your password'
    if (password !== confirmPassword) return 'Passwords do not match'
    return ''
  }

  const instruments = [
    'Guitar', 'Bass', 'Drums', 'Piano', 'Keyboard', 'Vocals', 'Violin', 'Saxophone', 
    'Trumpet', 'Flute', 'Cello', 'Clarinet', 'Ukulele', 'Harmonica', 'Other'
  ]

  const genres = [
    'Rock', 'Pop', 'Jazz', 'Blues', 'Hip Hop', 'Electronic', 'Classical', 'Folk',
    'Country', 'R&B', 'Funk', 'Reggae', 'Metal', 'Indie', 'Alternative', 'Other'
  ]

  const experiences = [
    'Beginner (0-2 years)',
    'Intermediate (3-5 years)',
    'Advanced (6-10 years)',
    'Professional (10+ years)'
  ]

  const goals = [
    'Learn new techniques', 'Create original music', 'Join a band', 'Record an album',
    'Perform live', 'Experiment with genres', 'Network with musicians', 'Have fun'
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Real-time validation
    let newValidationErrors = { ...validationErrors }
    
    if (name === 'email') {
      newValidationErrors.email = validateEmail(value)
    } else if (name === 'password') {
      newValidationErrors.password = validatePassword(value)
      // Also re-validate confirm password if it exists
      if (formData.confirmPassword) {
        newValidationErrors.confirmPassword = validateConfirmPassword(value, formData.confirmPassword)
      }
    } else if (name === 'confirmPassword') {
      newValidationErrors.confirmPassword = validateConfirmPassword(formData.password, value)
    }
    
    setValidationErrors(newValidationErrors)
  }

  const handleArrayToggle = (array: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [array]: (prev[array as keyof typeof prev] as string[]).includes(value)
        ? (prev[array as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[array as keyof typeof prev] as string[]), value]
    }))
  }

  const handleNext = () => {
    if (step === 1) {
      // Validate all fields
      const emailError = validateEmail(formData.email)
      const passwordError = validatePassword(formData.password)
      const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword)
      
      setValidationErrors({
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError
      })

      // Check for any validation errors
      if (emailError || passwordError || confirmPasswordError) {
        setError('Please fix the validation errors above')
        return
      }

      if (!formData.username) {
        setError('Username is required')
        return
      }
    }
    setError('')
    setStep(step + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        router.push('/dashboard')
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">SyncTown</span>
          </div>
          <h2 className="text-3xl font-bold">Join the Community</h2>
          <p className="mt-2 text-gray-400">Create your musical profile and find your perfect collaborators</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center space-x-2">
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              className={`w-3 h-3 rounded-full ${
                num <= step ? 'bg-primary-500' : 'bg-gray-600'
              } transition-colors duration-300`}
            />
          ))}
        </div>

        <motion.form
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}
          className="mt-8 space-y-6"
        >
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center mb-6">Account Information</h3>
              
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  required
                  className={`input-field pl-10 ${validationErrors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
                )}
              </div>

              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  required
                  className="input-field pl-10"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  required
                  className={`input-field pl-10 ${validationErrors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Password (min 8 chars, 1 uppercase, 1 number, 1 special char)"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
                )}
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  className={`input-field pl-10 ${validationErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.confirmPassword}</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm font-medium text-gray-300 mb-2">Password Requirements:</p>
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <div className={`flex items-center space-x-2 ${formData.password.length >= 8 ? 'text-green-400' : 'text-gray-400'}`}>
                    <span>{formData.password.length >= 8 ? '✓' : '○'}</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${/[A-Z]/.test(formData.password) ? 'text-green-400' : 'text-gray-400'}`}>
                    <span>{/[A-Z]/.test(formData.password) ? '✓' : '○'}</span>
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${/[a-z]/.test(formData.password) ? 'text-green-400' : 'text-gray-400'}`}>
                    <span>{/[a-z]/.test(formData.password) ? '✓' : '○'}</span>
                    <span>One lowercase letter</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${/\d/.test(formData.password) ? 'text-green-400' : 'text-gray-400'}`}>
                    <span>{/\d/.test(formData.password) ? '✓' : '○'}</span>
                    <span>One number</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-400' : 'text-gray-400'}`}>
                    <span>{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '✓' : '○'}</span>
                    <span>One special character</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center mb-6">Musical Profile</h3>
              
              <div>
                <label className="block text-sm font-medium mb-3">Instruments you play</label>
                <div className="grid grid-cols-2 gap-2">
                  {instruments.map((instrument) => (
                    <button
                      key={instrument}
                      type="button"
                      onClick={() => handleArrayToggle('instruments', instrument)}
                      className={`p-2 text-sm rounded-lg border transition-colors ${
                        formData.instruments.includes(instrument)
                          ? 'bg-primary-600 border-primary-500 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {instrument}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Preferred genres</label>
                <div className="grid grid-cols-2 gap-2">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleArrayToggle('genres', genre)}
                      className={`p-2 text-sm rounded-lg border transition-colors ${
                        formData.genres.includes(genre)
                          ? 'bg-secondary-600 border-secondary-500 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Experience level</label>
                <select
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="">Select experience level</option>
                  {experiences.map((exp) => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-center mb-6">Collaboration Goals</h3>
              
              <div>
                <label className="block text-sm font-medium mb-3">What do you want to achieve?</label>
                <div className="grid grid-cols-1 gap-2">
                  {goals.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => handleArrayToggle('collaborationGoals', goal)}
                      className={`p-3 text-sm rounded-lg border transition-colors text-left ${
                        formData.collaborationGoals.includes(goal)
                          ? 'bg-accent-600 border-accent-500 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating Account...' : step === 3 ? 'Create Account' : 'Next'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary-400 hover:text-primary-300">
                Sign in
              </Link>
            </p>
          </div>
        </motion.form>
      </div>
    </div>
  )
}
