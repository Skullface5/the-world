// ============ SUPABASE CONFIG ============
const SUPABASE_URL = 'https://knwpctdroogzwjrdotzo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbG...k4cI';
const tsupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

async function isAdmin(email) {
 if (!email) return false;
 const { data } = await tsupabase.from('admin_users').select('is_admin').eq('email', email.toLowerCase()).maybeSingle();
 if (!data) return email.toLowerCase() === 'azmmeli146@gmail.com';
 return !!data.is_admin;
}

async function checkSession() {
 const { data: { session } } = await tsupabase.auth.getSession();
 if (!session) return;
 if (await isAdmin(session.user.email)) {
  currentAdminEmail = session.user.email;
  showDashboard();
 } else {
  await tsupabase.auth.signOut();
  if (loginError) loginError.textContent = "Accès refusé. Vous n'êtes pas administrateur.";
 }
}

if (loginBtn) loginBtn.addEventListener('click', async () => {
 if (loginError) loginError.textContent = '';
 const email = document.getElementById('adminEmail').value.trim();
 const password = document.getElementById('adminPassword').value;
 const { data: signInData, error } = await tsupabase.auth.signInWithPassword({ email, password });
 if (error) {
  if (loginError) loginError.textContent = 'Identifiants invalides.';
  return;
 }
 if (!await isAdmin(signInData.user.email)) {
  await tsupabase.auth.signOut();
  if (loginError) loginError.textContent = "Accès refusé. Vous n'êtes pas administrateur.";
  return;
 }
 currentAdminEmail = signInData.user.email;
 showDashboard();
});

if (logoutBtn) logoutBtn.addEventListener('click', async () => {
 await tsupabase.auth.signOut();
 if (loginScreen) loginScreen.style.display = 'flex';
 if (dashboard) dashboard.style.display = 'none';
});

function showDashboard() {
 if (loginScreen) loginScreen.style.display = 'none';
 if (dashboard) dashboard.style.display = 'block';
 loadProducts();
}

async function saveProduct(e) {
 if (e) e.preventDefault();
 const id = document.getElementById('productId')?.value || '';
 const data = {
  name: document.getElementById('productName')?.value || '',
  category: document.getElementById('productCategory')?.value || 'unisexe',
  price: parseFloat(document.getElementById('productPrice')?.value || '0'),
  stock: parseInt(document.getElementById('productStock')?.value || '0', 10) || 0,
  images: JSON.stringify([document.getElementById('productImage')?.value || '']),
  description: document.getElementById('productDescription')?.value || '',
 };
 let res;
 if (id) res = await tsupabase.from('theworld_products').update(data).eq('id', id).select();
 else res = await tsupabase.from('theworld_products').insert([data]).select();
 if (res.error) alert('Erreur: ' + res.error.message);
 else { resetForm(); loadProducts(); alert('Produit enregistré'); }
}

async function loadProducts() {
 const { data, error } = await tsupabase.from('theworld_products').select('*').order('created_at', { ascending: false });
 if (error) { console.error('Error loading products:', error); alert('Erreur de chargement: ' + error.message); return; }
 renderProducts(data || []);
}

function escapeHtml(text) {
 return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderProducts(products) {
 const tbody = document.getElementById('productTableBody');
 if (!tbody) return;
 const fr = { brandName: 'The World', brandSub: 'Maison de Parfums', adminNoProducts: 'Aucun produit pour le moment.', adminProductsTitle: 'Gestion des produits', adminListTitle: 'Liste des produits', adminHeroTitle: 'Image Héro', adminSave: 'Enregistrer', adminReset: 'Réinitialiser', adminHeroHint: 'Conseil : utilisez un lien absolu ou importez dans /i/.', adminOrders: 'Commandes', adminBackToShop: 'Retour à la boutique', footerRights: 'Tous droits réservés.' };
 const t = fr;
 if (!products.length) {
  tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(t.adminNoProducts)}</td></tr>`;
  return;
 }
 tbody.innerHTML = products.map(p => `
  <tr>
   <td>${escapeHtml(p.name)}</td>
   <td>${escapeHtml(p.category || '')}</td>
   <td>${parseFloat(p.price || 0).toFixed(3).replace('.', ',')} TND</td>
   <td>${p.stock ?? 0}</td>
   <td>
    <button class="editProduct" data-id="${p.id}" type="button"><i class="fas fa-edit"></i></button>
    <button class="deleteProduct danger-action" data-id="${p.id}" type="button"><i class="fas fa-trash"></i></button>
   </td>
  </tr>
 `).join('');

 document.querySelectorAll('.editProduct').forEach(btn => btn.addEventListener('click', () => fillForm(btn.dataset.id)));
 document.querySelectorAll('.deleteProduct').forEach(btn => btn.addEventListener('click', async () => {
  if (!confirm('Supprimer ce produit ?')) return;
  const { error } = await tsupabase.from('theworld_products').delete().eq('id', btn.dataset.id);
  if (error) alert(error.message); else loadProducts();
 }));
}

function fillForm(id) {
 tsupabase.from('theworld_products').select('*').eq('id', id).single().then(({ data }) => {
  if (!data) return;
  document.getElementById('productId').value = data.id;
  document.getElementById('productName').value = data.name || '';
  document.getElementById('productCategory').value = data.category || 'unisexe';
  document.getElementById('productPrice').value = data.price;
  document.getElementById('productStock').value = data.stock ?? 0;
  let first = '';
  try { const arr = typeof data.images === 'string' ? JSON.parse(data.images) : data.images; if (Array.isArray(arr)) first = arr[0] || ''; } catch (e) {}
  document.getElementById('productImage').value = first;
  document.getElementById('productDescription').value = data.description || '';
 });
}

function resetForm() {
 ['productId', 'productName', 'productCategory', 'productPrice', 'productStock', 'productImage', 'productDescription'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = id === 'productCategory' ? 'unisexe' : '';
 });
}

async function saveHeroImage() {
 const url = document.getElementById('heroImageUrl')?.value || '';
 if (!url) return;
 const { error } = await tsupabase.from('site_settings').upsert({ key: 'hero_image_url', value: url });
 if (error) alert('Erreur: ' + error.message);
 else { applyHeroPreview(); alert('Image héro enregistrée'); }
}

function applyHeroPreview() {
 const img = document.getElementById('heroImageDisplay');
 if (!img) return;
 tsupabase.from('site_settings').select('value').eq('key', 'hero_image_url').maybeSingle().then(({ data }) => { if (data?.value) img.src = data.value; });
}

document.getElementById('productForm')?.addEventListener('submit', saveProduct);
document.getElementById('productReset')?.addEventListener('click', resetForm);
document.getElementById('heroImageSave')?.addEventListener('click', saveHeroImage);
applyHeroPreview();
loadProducts();
tsupabase.auth.getUser().then(({ data }) => console.log('admin ready', data?.user?.email));
