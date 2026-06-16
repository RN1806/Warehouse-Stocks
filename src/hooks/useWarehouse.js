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
    // Supabase caps a single select at 1000 rows, so page through all.
    let all = []
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('*, suppliers(id, name, category)')
        .order('name')
        .range(from, from + pageSize - 1)
      if (error || !data || data.length === 0) break
      all = all.concat(data)
      if (data.length < pageSize) break
      from += pageSize
    }
    setProducts(all)
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

// ── Shipments (abroad orders) ─────────────────────────────
export function useShipments() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('shipments')
      .select('*, shipment_items(*)')
      .order('created_at', { ascending: false })
    if (data) setShipments(data)
    setLoading(false)
  }, [])
  useEffect(() => { fetch() }, [fetch])
  return { shipments, loading, refetch: fetch }
}

export async function getShipment(id) {
  const { data, error } = await supabase
    .from('shipments')
    .select('*, shipment_items(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createShipment(form, items) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const { count } = await supabase.from('shipments').select('*', { count: 'exact', head: true })
  const num = String((count ?? 0) + 1).padStart(3, '0')
  const ship_number = `SH-${dateStr}-${num}`
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('shipments')
    .insert({ ...form, ship_number, created_by: user?.id ?? null })
    .select().single()
  if (error) throw error
  const filled = items.filter(it => it.product_name.trim())
  if (filled.length > 0) {
    // Look up each product's industry so cost visibility can be matched later.
    const names = filled.map(it => it.product_name.trim())
    const { data: prods } = await supabase
      .from('products')
      .select('name, industry')
      .in('name', names)
    const indByName = {}
    ;(prods || []).forEach(p => { indByName[p.name] = p.industry })

    const rows = filled.map((it, i) => ({
      shipment_id: data.id,
      product_name: it.product_name.trim(),
      quantity: it.quantity || null,
      unit: it.unit || null,
      industry: indByName[it.product_name.trim()] || null,
      item_order: i + 1,
    }))
    const { error: ie } = await supabase.from('shipment_items').insert(rows)
    if (ie) throw ie
  }
  return data
}

export async function deleteShipment(id) {
  const { error } = await supabase.from('shipments').delete().eq('id', id)
  if (error) throw error
}

// ── Stock IN report ───────────────────────────────────────
// Fetches confirmed stock-IN entries between two dates (inclusive),
// joined to their product so we can group by industry.
export async function fetchStockInReport(fromDate, toDate) {
  // toDate inclusive: add a day boundary
  const start = `${fromDate}T00:00:00`
  const end = `${toDate}T23:59:59`
  const { data, error } = await supabase
    .from('stock_updates')
    .select('*, products(name, industry, supplier_name, suppliers(name))')
    .eq('action', 'in')
    .eq('status', 'confirmed')
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Industry-based product visibility for pickers ─────────
// Regular sales staff may only pick products within their assigned industries.
// Sales managers and admins may pick any product (cross-industry).
export function visibleProductsFor(products, profile) {
  // Everyone can now SEE/pick any product. Cross-owner products trigger an
  // approval request at selection time (handled in the form), rather than
  // being hidden here. This replaces the old manager-only restriction.
  return products
}

// ── Update own profile (name + phone) ─────────────────────
export async function updateMyProfile(userId, { full_name, phone }) {
  const { error } = await supabase
    .from('sales_reps')
    .update({ full_name: full_name.trim(), phone: phone.trim() || null })
    .eq('id', userId)
  if (error) throw error
}

// ── Staff directory (admin) ───────────────────────────────
export function useStaff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('sales_reps')
      .select('*')
      .order('full_name')
    if (data) setStaff(data)
    setLoading(false)
  }, [])
  useEffect(() => { fetch() }, [fetch])
  return { staff, loading, refetch: fetch }
}

export async function updateStaffMember(id, fields) {
  const { error } = await supabase.from('sales_reps').update(fields).eq('id', id)
  if (error) throw error
}

// ── Sample request / ownership workflow ───────────────────
// Load the brand->owner map once.
export function useBrandOwners() {
  const [owners, setOwners] = useState([])
  useEffect(() => {
    supabase.from('brand_owners').select('keyword, owner_email').then(({ data }) => {
      if (data) setOwners(data)
    })
  }, [])
  return owners
}

// Given a product name + the brand-owner list, return the set of owner emails
// that own a brand keyword appearing in the product name.
export function ownersForProduct(productName, brandOwners) {
  if (!productName) return []
  const lower = productName.toLowerCase()
  const found = brandOwners
    .filter(bo => bo.keyword && lower.includes(bo.keyword.toLowerCase()))
    .map(bo => bo.owner_email.toLowerCase())
  return [...new Set(found)]
}

// Decide if a user needs approval to use a product.
// Returns { needsApproval: bool, owners: [emails] }
// No owner found  -> free to use (unowned)
// User IS an owner -> free
// Otherwise        -> needs approval from owners
export function approvalCheck(productName, brandOwners, myEmail) {
  const owners = ownersForProduct(productName, brandOwners)
  if (owners.length === 0) return { needsApproval: false, owners: [] }
  if (myEmail && owners.includes(myEmail.toLowerCase())) return { needsApproval: false, owners }
  return { needsApproval: true, owners }
}

export async function createSampleRequest({ productName, ownerEmail, note }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('sales_reps').select('email').eq('id', user.id).single()
  const { error } = await supabase.from('sample_requests').insert({
    product_name: productName,
    requester_id: user.id,
    requester_email: me?.email,
    owner_email: ownerEmail,
    note: note || null,
  })
  if (error) throw error
}

// Requests addressed to me (owner inbox)
export function useIncomingRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const fetch = useCallback(async () => {
    const { data } = await supabase.from('sample_requests')
      .select('*').order('created_at', { ascending: false })
    if (data) setRequests(data)
    setLoading(false)
  }, [])
  useEffect(() => { fetch() }, [fetch])
  return { requests, loading, refetch: fetch }
}

export async function decideRequest(id, status) {
  const { error } = await supabase.from('sample_requests')
    .update({ status, decided_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// Has THIS user been approved for THIS product already?
export function hasApproval(productName, requests, myId) {
  return requests.some(r =>
    r.requester_id === myId &&
    r.status === 'approved' &&
    r.product_name === productName
  )
}
