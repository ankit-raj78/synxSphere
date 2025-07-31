'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Music, Users, Brain, Activity, Play, Upload, Headphones, Zap } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [currentDemo, setCurrentDemo] = useState(0)
  
  const demoFeatures = [
    {
      title: "AI Audio Analysis",
      description: "Upload your music and watch our AI extract musical DNA - tempo, harmony, and style",
      icon: Brain,
      color: "from-blue-500 to-purple-600"
    },
    {
      title: "Smart Matching",
      description: "Get paired with compatible musicians based on actual musical compatibility",
      icon: Users,
      color: "from-purple-500 to-pink-600"
    },
    {
      title: "Real-time Collaboration",
      description: "Join rooms and collaborate with perfect musical partners instantly",
      icon: Music,
      color: "from-pink-500 to-red-600"
    },
    {
      title: "Seamless Compilation",
      description: "Combine individual tracks into professional collaborative compositions",
      icon: Zap,
      color: "from-red-500 to-orange-600"
    }  ]

  // Check if user is already logged in and redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (token && userData) {
      // User is already logged in, redirect to dashboard
      router.push('/dashboard')
    }
  }, [router])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDemo((prev) => (prev + 1) % demoFeatures.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [demoFeatures.length])

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">SyncTown</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="text-gray-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link href="/auth/register" className="btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                  AI-Powered
                </span>
                <br />
                Music Collaboration
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Discover your perfect musical collaborators through intelligent AI analysis. 
                Upload your music, get matched with compatible artists, and create amazing music together.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
                Start Collaborating
              </Link>
              <Link href="/demo" className="btn-secondary text-lg px-8 py-3 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Watch Demo
              </Link>
            </motion.div>
          </div>

          {/* Music Wave Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="flex justify-center items-end space-x-2 mb-16"
          >
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="music-wave"
                style={{
                  height: `${Math.random() * 60 + 20}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Demo Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Experience the Magic</h2>
            <p className="text-xl text-gray-300">
              Watch how AI transforms music collaboration
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Demo Animation */}
            <motion.div
              key={currentDemo}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className={`card bg-gradient-to-br ${demoFeatures[currentDemo].color} p-8`}>
                <div className="flex items-center mb-6">
                  {(() => {
                    const IconComponent = demoFeatures[currentDemo].icon;
                    return <IconComponent className="w-12 h-12 text-white mr-4" />;
                  })()}
                  <h3 className="text-2xl font-bold text-white">
                    {demoFeatures[currentDemo].title}
                  </h3>
                </div>
                <p className="text-white/90 text-lg">
                  {demoFeatures[currentDemo].description}
                </p>
              </div>
            </motion.div>

            {/* Feature List */}
            <div className="space-y-4">
              {demoFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className={`card cursor-pointer transition-all duration-300 ${
                    index === currentDemo 
                      ? 'ring-2 ring-primary-500 bg-gray-700' 
                      : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setCurrentDemo(index)}
                >
                  <div className="flex items-center">
                    {(() => {
                      const IconComponent = feature.icon;
                      return <IconComponent className="w-8 h-8 text-primary-400 mr-4" />;
                    })()}
                    <div>
                      <h4 className="text-lg font-semibold">{feature.title}</h4>
                      <p className="text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How SyncTown Works</h2>
            <p className="text-xl text-gray-300">
              Four simple steps to find your perfect musical match
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Upload Your Music",
                description: "Share your tracks and let our AI analyze your musical style",
                icon: Upload,
                color: "from-blue-500 to-cyan-500"
              },
              {
                step: "2",
                title: "AI Analysis",
                description: "Our intelligent system extracts tempo, harmony, and musical DNA",
                icon: Brain,
                color: "from-purple-500 to-pink-500"
              },
              {
                step: "3",
                title: "Smart Matching",
                description: "Get matched with compatible musicians in real-time",
                icon: Users,
                color: "from-pink-500 to-red-500"
              },
              {
                step: "4",
                title: "Collaborate",
                description: "Join rooms and create amazing music together",
                icon: Headphones,
                color: "from-orange-500 to-yellow-500"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center`}>
                  {(() => {
                    const IconComponent = step.icon;
                    return <IconComponent className="w-8 h-8 text-white" />;
                  })()}
                </div>
                <div className="text-3xl font-bold text-primary-400 mb-2">{step.step}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-900/50 to-secondary-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl font-bold mb-4">Ready to Find Your Musical Match?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of musicians already creating magic together
            </p>
            <Link href="/auth/register" className="btn-primary text-lg px-8 py-4">
              Start Your Musical Journey
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold">SyncTown</span>
          </div>
          <p>&copy; 2025 SyncTown. AI-Powered Music Collaboration Platform.</p>
        </div>
      </footer>
    </div>
  )
}
