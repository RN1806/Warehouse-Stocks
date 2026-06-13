import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)

  async function fetchProfile(userId) {
    const { data } = await supabase.from('sales_reps').select('*').eq('id', userId).single()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password, fullName, phone) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    const { error: pe } = await supabase.from('sales_reps').insert({
      id: data.user.id, full_name: fullName, email, phone: phone || null
    })
    if (pe) throw pe
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() { await supabase.auth.signOut() }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ session, profile, signUp, signIn, signOut, resetPassword, refreshProfile: () => session && fetchProfile(session.user.id) }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
