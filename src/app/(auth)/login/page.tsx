"use client"

import type React from "react"

import { useState } from "react"
import { useUser } from "@/context/userContext"
import "@/styles/login.css"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login, error } = useUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    await login(email, password)
    setIsLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-form-section">
          <div className="login-form-wrapper">
            <div className="login-form">
              <h1 className="login-title">Iniciar Sesión</h1>

              <form onSubmit={handleSubmit} className="login-form-content">
                <div className="form-group">
                  <label className="form-label">Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <input
                    type="password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="form-input"
                  />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="login-button" disabled={isLoading}>
                  {isLoading ? "Iniciando..." : "Iniciar Sesión"}
                </button>
              </form>

              <div className="login-footer-info">
                <p className="footer-text">¿Primera vez aquí? Contacta con el administrador</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
 