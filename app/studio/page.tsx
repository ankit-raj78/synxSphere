'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface UserInfo {
  id: string;
  email: string;
  username: string;
}

export default function StudioPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token')
    const userString = localStorage.getItem('user')
    
    if (!token || !userString) {
      router.push('/auth/login?redirect=/studio')
      return
    }

    try {
      const userData = JSON.parse(userString)
      setUserInfo(userData)
      setIsAuthenticated(true)
      setIsLoading(false)
    } catch (error) {
      console.error('Error parsing user data:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      router.push('/auth/login?redirect=/studio')
    }
  }, [router])

  const handleMessage = (event: MessageEvent) => {
    // Handle messages from the openDAW iframe
    if (event.origin !== window.location.origin) return

    switch (event.data.type) {
      case 'SAVE_PROJECT':
        handleSaveProject(event.data.projectData)
        break
      case 'LOAD_PROJECT':
        handleLoadProject(event.data.projectId)
        break
      case 'GET_USER_INFO':
        // Send user info to openDAW
        event.source?.postMessage({
          type: 'USER_INFO',
          userInfo: {
            id: userInfo?.id,
            email: userInfo?.email,
            username: userInfo?.username
          }
        }, { targetOrigin: event.origin })
        break
    }
  }

  const handleSaveProject = async (projectData: any) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/studio/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: projectData.name || 'Untitled Project',
          data: projectData,
          userId: userInfo?.id
        })
      })

      if (response.ok) {
        const result = await response.json()
        // Send success back to openDAW
        const iframe = document.getElementById('opendaw-iframe') as HTMLIFrameElement
        iframe?.contentWindow?.postMessage({
          type: 'SAVE_SUCCESS',
          projectId: result.id
        }, window.location.origin)
      }
    } catch (error) {
      console.error('Save project failed:', error)
    }
  }

  const handleLoadProject = async (projectId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/studio/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const project = await response.json()
        // Send project data back to openDAW
        const iframe = document.getElementById('opendaw-iframe') as HTMLIFrameElement
        iframe?.contentWindow?.postMessage({
          type: 'LOAD_SUCCESS',
          projectData: project.projectData
        }, window.location.origin)
      }
    } catch (error) {
      console.error('Load project failed:', error)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      window.addEventListener('message', handleMessage)
      return () => window.removeEventListener('message', handleMessage)
    }
  }, [isAuthenticated, userInfo])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading Studio...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header with user info and navigation */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back to SynxSphere
          </button>
          <h1 className="text-white font-bold">openDAW Studio</h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-400">Welcome, {userInfo?.username || userInfo?.email}</span>
          <button
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              router.push('/auth/login')
            }}
            className="text-gray-400 hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* openDAW iframe */}
      <iframe
        id="opendaw-iframe"
        src="/api/studio-files"
        className="w-full"
        style={{ height: 'calc(100vh - 60px)' }}
        allow="microphone; camera; midi; encrypted-media; autoplay"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
        title="openDAW Studio"
      />
    </div>
  )
}
