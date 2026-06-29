import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { ProjectView } from './pages/ProjectView'

import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="bottom-right" />
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:projectId" element={<ProjectView />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
