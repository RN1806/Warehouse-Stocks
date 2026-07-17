import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
const [session, setSession] = useState(undefined)
const [profile, setProfile] = useState(null)
// True while the user arrived here via a "reset password" email link.
// Supabase fires a PASSWORD_RECOVERY auth event in that case — we use it to
// show a "set new password" screen instead of the normal app.
const [isRecovery, setIsRecovery] = useState(false)

async function fetchProfile(userId) {
const { data } = await supabase.from('sales_reps').select('*').eq('id', userId).single()
setProfile(data)
}

useEffect(() => {
supabase.auth.getSession().then(({ data: { session } }) => {
setSession(session)
if (session) fetchProfile(session.user.id)
})
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
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

// Set a new password. Used both by the "reset password" email-link flow
// (isRecovery === true) and by the logged-in "change password" screen.
async function updatePassword(newPassword) {
const { error } = await supabase.auth.updateUser({ password: newPassword })
if (error) throw error
setIsRecovery(false)
}

return (
<AuthContext.Provider value={{
session, profile, signUp, signIn, signOut, resetPassword, updatePassword,
isRecovery, clearRecovery: () => setIsRecovery(false),
refreshProfile: () => session && fetchProfile(session.user.id),
}}>
{children}
</AuthContext.Provider>
)
}

export const useAuth = () => useContext(AuthContext)
