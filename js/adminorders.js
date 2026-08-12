// ============ SUPABASE CONFIG ============
const SUPABASE_URL = 'https://knwpctdroogzwjrdotzo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbG...k4cI';
const tsupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentLang = localStorage.getItem('smp_lang') || 'fr';
let allOrders = [];
let currentFilter = 'all';
let currentSearch = '';

const statusLabels = {
 pending: 'En attente',
 under_review: 'En vérification',
 confirmed: 'Confirmée',
 shipped: 'Expédiée',
 delivered: 'Livrée',
 cancelled: 'Annulée'
};

async function isAdmin() {
 const { data } = await tsupabase.auth.getUser();
 const email = (data?.user?.email || '').toLowerCase();
 if (!email) return false;
 const { data: row } = await tsupabase.from('admin_users').select('is_admin').eq('email', email).maybeSingle();
 if (!row) return email === 'azmmeli146@gmail.com';
 return !!row.is_admin;
}

async function checkSession() {
 const { data: { session } } = await tsupabase.auth.getSession();
 if (!session) { window.location.href = 'admin.html'; return; }
 if (!await isAdmin()) { window.location.href = 'admin.html'; }
}

function formatOrderNumber(id) {
 const str = String(id);
 return /^\d+$/.test(str) ? '#' + str.padStart(4, '0') : '#' + str.slice(0, 8);
}

async function loadOrders() {
 const { data, error } = await tsupabase
  .from('theworld_orders')
  .select('*')
  .order('created_at', { ascending: false });
 if (error) {
  console.error('Error loading orders:', error);
  document.getElementById('ordersTableBody').innerHTML = '<tr><td colspan="8">Erreur de chargement</td></tr>';
  return;
 }
 allOrders = data || [];
 renderOrders();
}

function getFiltered() {
 return allOrders.filter(o => {
  const matchStatus = currentFilter === 'all' || o.status === currentFilter;
  if (!currentSearch) return matchStatus;
  const q = currentSearch.toLowerCase();
  const matchSearch =
   (o.customer_name || '').toLowerCase().includes(q) ||
   (o.customer_phone || '').toLowerCase().includes(q) ||
   (o.customer_email || '').toLowerCase().includes(q) ||
   formatOrderNumber(o.id).toLowerCase().includes(q) ||
   String(o.id).toLowerCase().includes(q);
  return matchStatus && matchSearch;
 });
}

function renderOrders() {
 const tbody = document.getElementById('ordersTableBody');
 const filtered = getFiltered();
 if (!allOrders.length) {
  tbody.innerHTML = '<tr><td colspan="8">Aucune commande pour le moment.</td></tr>';
  return;
 }
 if (!filtered.length) {
  tbody.innerHTML = '<tr><td colspan="8">Aucune commande ne correspond à ces filtres.</td></tr>';
  return;
 }

 tbody.innerHTML = filtered.map(o => `
  <tr>
   <td>${formatOrderNumber(o.id)}</td>
   <td>${escapeHtml(o.customer_name || '—')}</td>
   <td>${escapeHtml(o.customer_phone || '—')}</td>
   <td>${escapeHtml(o.customer_email || '—')}</td>
   <td>${parseFloat(o.total || 0).toFixed(3).replace('.', ',')} TND</td>
   <td>
    <select class="order-status-select" data-id="${o.id}">
     ${Object.keys(statusLabels).map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${statusLabels[s]}</option>`).join('')}
    </select>
   </td>
   <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
   <td>
    <button class="view-order-btn" data-id="${o.id}" type="button"><i class="fas fa-eye"></i></button>
   </td>
  </tr>
 `).join('');

 tbody.querySelectorAll('.order-status-select').forEach(sel => sel.addEventListener('change', (e) => updateOrderStatus(e.target.dataset.id, e.target.value)));
 tbody.querySelectorAll('.view-order-btn').forEach(btn => btn.addEventListener('click', () => viewOrder(btn.dataset.id)));
}

async function updateOrderStatus(id, status) {
 const { error } = await tsupabase.from('theworld_orders').update({ status }).eq('id', id);
 if (error) alert('Erreur: ' + error.message);
}

function viewOrder(id) {
 const order = allOrders.find(o => String(o.id) === String(id));
 if (!order) return;
 let items = [];
 try { items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } catch (e) { items = []; }
 const text = [
  'Commande ' + formatOrderNumber(order.id),
  'Client: ' + (order.customer_name || '—'),
  'Téléphone: ' + (order.customer_phone || '—'),
  'Email: ' + (order.customer_email || '—'),
  'Adresse: ' + (order.shipping_address || '—'),
  'Total: ' + parseFloat(order.total || 0).toFixed(3).replace('.', ',') + ' TND',
  'Statut: ' + (statusLabels[order.status] || order.status),
  'Articles:\n' + items.map(i => '- ' + (i.name || i.id) + ' x' + (i.qty || 1) + ' = ' + parseFloat(i.price || 0).toFixed(3).replace('.', ',') + ' TND').join('\n')
 ].join('\n');
 alert(text);
}

function escapeHtml(text) {
 return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.getElementById('year').textContent = new Date().getFullYear();
document.getElementById('orderSearch')?.addEventListener('input', (e) => { currentSearch = e.target.value; renderOrders(); });
document.getElementById('orderStatusFilter')?.addEventListener('change', (e) => { currentFilter = e.target.value; renderOrders(); });
checkSession().then(loadOrders);
