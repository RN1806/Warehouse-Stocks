import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Suppliers ─────────────────────────────────────────────
export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([])
  const fetch = useCallback(async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    if (data) setSuppliers(data)
  }, [])
  useEffect(() => { fetch() }, [fetch])

  // Group by category, alphabetical
  const grouped = {}
  suppliers.forEach(s => {
    const cat = s.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  })

  return { suppliers, grouped, refetch: fetch }
}

export async function addSupplier({ name, category }) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ name: name.trim(), category: category || 'Other' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Products ──────────────────────────────────────────────
export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*, suppliers(id, name, category)')
      .order('name')
    if (data) setProducts(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const ch = supabase.channel('products-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetch])

  return { products, loading, refetch: fetch }
}

export async function addProduct(payload) {
  const { data, error } = await supabase.from('products').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// ── Stock updates ─────────────────────────────────────────
export function useStockUpdates() {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('stock_updates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (data) setUpdates(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const ch = supabase.channel('stock-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_updates' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetch])

  return { updates, loading, refetch: fetch }
}

export async function submitStockUpdate(payload) {
  // Insert the update record
  const { data, error } = await supabase.from('stock_updates').insert({
    ...payload,
    status: payload.status ?? 'pending',
  }).select().single()
  if (error) throw error

  // If confirmed, adjust product qty
  if (payload.status === 'confirmed' && payload.product_id) {
    await applyStockQty(payload.product_id, payload.action, payload.total_amount)
  }
  return data
}

export async function confirmStockUpdate(updateId, productId, action, totalAmount) {
  const { error } = await supabase
    .from('stock_updates')
    .update({ status: 'confirmed' })
    .eq('id', updateId)
  if (error) throw error
  await applyStockQty(productId, action, totalAmount)
}

async function applyStockQty(productId, action, amount) {
  const { data: p } = await supabase.from('products').select('current_qty').eq('id', productId).single()
  if (!p) return
  let newQty = p.current_qty
  if (action === 'in')     newQty = p.current_qty + (amount || 0)
  if (action === 'out')    newQty = Math.max(0, p.current_qty - (amount || 0))
  if (action === 'adjust') newQty = amount || 0
  await supabase.from('products').update({ current_qty: newQty }).eq('id', productId)
}

export async function undoStockUpdate(updateId, productId, action, totalAmount) {
  // Reverse the qty change
  const { data: p } = await supabase.from('products').select('current_qty').eq('id', productId).single()
  if (p) {
    let newQty = p.current_qty
    if (action === 'in')  newQty = Math.max(0, p.current_qty - (totalAmount || 0))
    if (action === 'out') newQty = p.current_qty + (totalAmount || 0)
    await supabase.from('products').update({ current_qty: newQty }).eq('id', productId)
  }
  await supabase.from('stock_updates').delete().eq('id', updateId)
}

// ── Customers ─────────────────────────────────────────────
export function useCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    const { data } = await supabase.from('customers').select('*').order('company_name')
    if (data) setCustomers(data)
    setLoading(false)
  }, [])
  useEffect(() => { fetch() }, [fetch])
  return { customers, loading, refetch: fetch }
}

export async function saveCustomer(payload) {
  if (payload.id) {
    const { id, created_by, created_at, ...rest } = payload
    const { error } = await supabase.from('customers').update(rest).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('customers').insert(payload)
    if (error) throw error
  }
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}

// ── Deliveries ────────────────────────────────────────────
export function useDeliveries() {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('deliveries')
      .select('*, delivery_items(*)')
      .order('created_at', { ascending: false })
    if (data) setDeliveries(data)
    setLoading(false)
  }, [])
  useEffect(() => {
    fetch()
    const ch = supabase.channel('del-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetch])
  return { deliveries, loading, refetch: fetch }
}

export async function getDelivery(id) {
  const { data, error } = await supabase
    .from('deliveries').select('*, delivery_items(*)')
    .eq('id', id).single()
  if (error) throw error
  return data
}

export async function createDelivery(form, items) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const { count } = await supabase.from('deliveries').select('*', { count: 'exact', head: true })
  const num = String((count ?? 0) + 1).padStart(3, '0')
  const form_number = `KW-${dateStr}-${num}`
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('deliveries').insert({ ...form, form_number, sales_rep_id: user?.id ?? null }).select().single()
  if (error) throw error
  if (items.length > 0) {
    const rows = items.map((item, i) => ({ ...item, delivery_id: data.id, item_order: i + 1 }))
    const { error: ie } = await supabase.from('delivery_items').insert(rows)
    if (ie) throw ie
  }
  return data
}

export async function updateDeliveryStatus(id, status) {
  const { error } = await supabase.from('deliveries').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteDelivery(id) {
  const { error } = await supabase.from('deliveries').delete().eq('id', id)
  if (error) throw error
}
