import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { API_URL } from './src/config';
import * as ImagePicker from 'expo-image-picker';

const RED = '#C4192E';
const money = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const statusLabel = { aguardando_pagamento:'Aguardando pagamento', confirmado:'Confirmado', em_preparo:'Em preparo', pronto:'Pronto para retirada', entregue:'Entregue', cancelado:'Cancelado' };

export default function App() {
  const [screen, setScreen] = useState('auth');
  const [authMode, setAuthMode] = useState('login');
  const [nome, setNome] = useState('');
  const [signupPhoto, setSignupPhoto] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [adminDay, setAdminDay] = useState('');
  const [payment, setPayment] = useState('pix_simulado');
  const [orders, setOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [profile, setProfile] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [audit, setAudit] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [editProduct, setEditProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStock, setEditStock] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [loyalty, setLoyalty] = useState(null);
  const [supportSubject,setSupportSubject]=useState('');
  const [supportMessage,setSupportMessage]=useState('');
  const [supportTickets,setSupportTickets]=useState([]);
  const [slotStart,setSlotStart]=useState('');
  const [slotEnd,setSlotEnd]=useState('');
  const [slotCapacity,setSlotCapacity]=useState('10');
  const [adminSlots,setAdminSlots]=useState([]);
  const [adminAnalytics,setAdminAnalytics]=useState(null);
  const [reviewProduct,setReviewProduct]=useState(null);
  const [reviewText,setReviewText]=useState('');
  const [reviewRating,setReviewRating]=useState('5');

  async function api(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Erro HTTP ${response.status}`);
    return data;
  }
  async function loadCatalog() {
    const [p,c] = await Promise.all([api('/products'), api('/categories')]);
    setProducts(p); setCategories(c);
  }
  async function loadSlots() {
    const data = await api('/slots');
    setSlots(data);
    if (data.length && !slotId) setSlotId('');
  }
  async function loadOrders() { setOrders(await api('/orders/mine')); }
  async function loadAdmin() {
    const [o,s] = await Promise.all([api('/admin/orders'), api('/admin/summary')]);
    setAdminOrders(o); setSummary(s);
  }
  async function choosePhoto(forRegistration = true) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permissão necessária','Autorize o acesso às fotos para selecionar sua imagem.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:['images'], allowsEditing:true, aspect:[1,1], quality:0.55, base64:true
    });
    if (result.canceled || !result.assets?.[0]) return;
    const photo = result.assets[0];
    if (!photo.base64) return Alert.alert('Foto','Não foi possível ler a foto selecionada.');
    setPhotoBusy(true);
    try {
      const data = await api('/uploads/avatar',{method:'POST',body:JSON.stringify({
        base64:photo.base64,mimeType:photo.mimeType==='image/png'?'image/png':'image/jpeg'
      })});
      if (forRegistration) setSignupPhoto(data.url);
      else setProfilePhoto(data.url);
    } catch(e) { Alert.alert('Erro na foto',e.message); }
    finally { setPhotoBusy(false); }
  }
  async function submitAuth() {
    setLoading(true);
    try {
      if (authMode === 'register') {
        await api('/auth/register', { method:'POST', body:JSON.stringify({ nome, email, senha, foto_url:signupPhoto }) });
        Alert.alert('Cadastro realizado', 'Agora entre com seu e-mail e senha.');
        setAuthMode('login'); setSignupPhoto(null);
      } else {
        const data = await api('/auth/login', { method:'POST', body:JSON.stringify({ email, senha }) });
        if (authMode === 'store' && data.user.funcao !== 'admin') {
          throw new Error('Esta conta não tem permissão para acessar o painel da loja.');
        }
        if (authMode !== 'store' && data.user.funcao === 'admin') {
          // Administradores também podem entrar pelo acesso comum e serão direcionados ao painel.
        }
        setToken(data.token); setUser(data.user);
        // Token is set asynchronously; use the returned token for first requests.
        const base = { 'Content-Type':'application/json', Authorization:`Bearer ${data.token}` };
        const get = async path => { const r=await fetch(`${API_URL}${path}`,{headers:base}); const d=await r.json(); if(!r.ok) throw new Error(d.error || 'Erro'); return d; };
        const [p,c] = await Promise.all([get('/products'),get('/categories')]);
        setProducts(p); setCategories(c);
        setScreen(data.user.funcao === 'admin' ? 'admin' : 'home');
      }
    } catch(e) { Alert.alert('Não foi possível continuar', e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (token && user && user.funcao === 'aluno' && (screen === 'checkout' || screen === 'schedule')) loadSlots().catch(e=>Alert.alert('Horários',e.message));
    if (token && (screen === 'profile' || screen === 'editProfile')) api('/profile').then(p=>{setProfile(p);setProfileName(p.nome);setProfilePhoto(p.foto_url||'');}).catch(e=>Alert.alert('Perfil',e.message));
    if (token && screen === 'notifications') api('/notifications').then(setNotifications).catch(e=>Alert.alert('Avisos',e.message));
    if (token && user?.funcao === 'admin' && screen === 'audit') Promise.all([api('/admin/audit'),api('/admin/transactions')]).then(([a,t])=>{setAudit(a);setTransactions(t);}).catch(e=>Alert.alert('Auditoria',e.message));
    if (token && screen === 'favorites') api('/favorites').then(setFavorites).catch(e=>Alert.alert('Favoritos',e.message));
    if (token && screen === 'loyalty') api('/loyalty').then(setLoyalty).catch(e=>Alert.alert('Pontos',e.message));
    if (token && screen === 'support') api('/support').then(setSupportTickets).catch(e=>Alert.alert('Suporte',e.message));
    if (token && screen === 'slotsAdmin') api('/admin/slots').then(setAdminSlots).catch(e=>Alert.alert('Horários',e.message));
    if (token && screen === 'analytics') api('/admin/analytics').then(setAdminAnalytics).catch(e=>Alert.alert('Relatórios',e.message));
    if (token && screen === 'orders') loadOrders().catch(e=>Alert.alert('Pedidos',e.message));
    if (token && user?.funcao === 'admin' && screen === 'admin') loadAdmin().catch(e=>Alert.alert('Painel',e.message));
  }, [screen, token, user]);

  const calendarDates = useMemo(() => {
    const base = new Date(); base.setHours(12,0,0,0); base.setDate(base.getDate() + calendarOffset * 7);
    return Array.from({length:7},(_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);return {key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,day:d.toLocaleDateString('pt-BR',{weekday:'short'}),number:d.getDate()};});
  },[calendarOffset]);
  const activeDay = selectedDay || calendarDates[0].key;
  const daySlots = slots.filter(x => new Date(x.inicio).getFullYear()+'-'+String(new Date(x.inicio).getMonth()+1).padStart(2,'0')+'-'+String(new Date(x.inicio).getDate()).padStart(2,'0') === activeDay);
  const shownProducts = useMemo(() => products.filter(p =>
    (category === 'all' || p.categoria_slug === category) &&
    (!search || `${p.nome} ${p.descricao || ''}`.toLowerCase().includes(search.toLowerCase()))
  ), [products, category, search]);
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.preco) * item.quantidade, 0);
  function addToCart(product) {
    if (!product.disponivel) return Alert.alert('Indisponível', 'Este produto não está disponível no momento.');
    setCart(old => {
      const found = old.find(i => i.id === product.id);
      return found ? old.map(i => i.id === product.id ? { ...i, quantidade: i.quantidade + 1 } : i) : [...old, { ...product, quantidade:1 }];
    });
    // O contador na barra superior confirma a adição sem interromper a navegação.
  }
  function changeQty(id, delta) {
    setCart(old => old.map(i => i.id === id ? { ...i, quantidade:i.quantidade+delta } : i).filter(i => i.quantidade > 0));
  }
  async function checkout() {
    if (slots.length && (!slotId || !slots.some(s=>String(s.id)===slotId && daySlots.some(d=>d.id===s.id)))) return Alert.alert('Escolha um horário','Selecione um horário disponível no dia escolhido.');
    if (!cart.length) return Alert.alert('Carrinho vazio', 'Adicione algum produto antes de finalizar.');
    setLoading(true);
    try {
      const result = await api('/orders', { method:'POST', body:JSON.stringify({
        items:cart.map(i=>({ produto_id:i.id, quantidade:i.quantidade })),
        horario_id:slotId ? Number(slotId) : null, metodo:payment
      })});
      setLastOrder(result); setCart([]); setScreen('success');
    } catch(e) { Alert.alert('Não foi possível finalizar',e.message); }
    finally { setLoading(false); }
  }
  async function createProduct() {
    const price = Number(String(newProductPrice).replace(',', '.'));
    if (!newProductName.trim() || !newProductCategory || !Number.isFinite(price) || price < 0) {
      return Alert.alert('Confira os dados', 'Informe nome, categoria e um preço válido.');
    }
    setLoading(true);
    try {
      await api('/admin/products', { method:'POST', body:JSON.stringify({
        nome:newProductName.trim(), descricao:newProductDescription.trim(),
        preco:price, categoria_id:Number(newProductCategory),
        imagem_url:newProductImage.trim() || null,
        estoque:newProductStock.trim()==='' ? null : Number(newProductStock),
        disponivel:true
      })});
      setNewProductName(''); setNewProductPrice(''); setNewProductDescription('');
      setNewProductImage(''); setNewProductStock('');
      await loadCatalog(); await loadAdmin();
      Alert.alert('Produto cadastrado', 'O produto já está disponível no cardápio.');
    } catch(e) { Alert.alert('Não foi possível cadastrar', e.message); }
    finally { setLoading(false); }
  }

  async function toggleProductAvailability(product) {
    try {
      await api(`/admin/products/${product.id}`, {
        method:'PATCH',
        body:JSON.stringify({ disponivel:!product.disponivel })
      });
      await loadCatalog();
      Alert.alert('Produto atualizado', product.disponivel ? 'Produto pausado no cardápio.' : 'Produto voltou ao cardápio.');
    } catch(e) { Alert.alert('Erro ao atualizar produto', e.message); }
  }

  async function adminStatus(id, status) {
    try { await api(`/admin/orders/${id}/status`, {method:'PATCH',body:JSON.stringify({status})}); await loadAdmin(); }
    catch(e) { Alert.alert('Erro ao atualizar',e.message); }
  }
  function logout() {
    setToken(''); setUser(null); setCart([]); setScreen('auth'); setAuthMode('login'); setSenha('');
  }
  async function saveProfile() {
    try { await api('/profile',{method:'PATCH',body:JSON.stringify({nome:profileName,foto_url:profilePhoto||null,notificacoes_ativas:profile?.notificacoes_ativas!==0})});
      setUser(old=>({...old,nome:profileName})); Alert.alert('Pronto','Perfil atualizado.');
    } catch(e){Alert.alert('Erro',e.message)}
  }
  function startEdit(p){setEditProduct(p);setEditName(p.nome);setEditPrice(String(p.preco));setEditDescription(p.descricao||'');setEditStock(p.estoque==null?'':String(p.estoque));}
  async function saveEdit(){
    const preco=Number(editPrice.replace(',','.'));
    if(!editName.trim()||!Number.isFinite(preco)||preco<0|| (editStock!==''&&(!/^\d+$/.test(editStock))))return Alert.alert('Dados inválidos','Revise nome, preço e estoque.');
    try {await api(`/admin/products/${editProduct.id}`,{method:'PATCH',body:JSON.stringify({nome:editName,descricao:editDescription,preco,estoque:editStock===''?null:Number(editStock)})});setEditProduct(null);await loadCatalog();Alert.alert('Sucesso','Produto atualizado.');}
    catch(e){Alert.alert('Erro',e.message)}
  }
  function go(next) { setScreen(next); }

  const Header = ({ title, back = 'home' }) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => go(back)}><Text style={styles.headerBack}>‹</Text></TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={logout}><Text style={styles.headerExit}>Sair</Text></TouchableOpacity>
    </View>
  );
  const Btn = ({ title, onPress, secondary = false, disabled = false }) => (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, disabled && {opacity:0.5}]}>
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
    </TouchableOpacity>
  );
  const MenuEntry = ({icon,title,subtitle,onPress}) => (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.menuEntry}>
      <View style={styles.menuIcon}><Text style={styles.menuIconText}>{icon}</Text></View>
      <View style={{flex:1}}><Text style={styles.menuTitle}>{title}</Text><Text style={styles.menuSubtitle}>{subtitle}</Text></View>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );
  const DayPicker = () => (
    <View style={styles.calendarPanel}>
      <View style={styles.rowBetween}>
        <Text style={styles.calendarTitle}>Selecione o dia</Text>
        <View style={{flexDirection:'row',gap:14}}>
          <TouchableOpacity onPress={()=>{setCalendarOffset(x=>Math.max(0,x-1));setSelectedDay('')}}><Text style={styles.calendarArrow}>‹</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>{setCalendarOffset(x=>x+1);setSelectedDay('')}}><Text style={styles.calendarArrow}>›</Text></TouchableOpacity>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7,paddingVertical:12}}>
        {calendarDates.map(d=><TouchableOpacity key={d.key} onPress={()=>setSelectedDay(d.key)} style={[styles.calendarDay,activeDay===d.key&&styles.calendarDayActive]}>
          <Text style={[styles.calendarDayText,activeDay===d.key&&styles.calendarDayTextActive]}>{d.day.replace('.','')}</Text>
          <Text style={[styles.calendarNumber,activeDay===d.key&&styles.calendarDayTextActive]}>{d.number}</Text>
        </TouchableOpacity>)}
      </ScrollView>
      <Text style={styles.menuSubtitle}>Retirada das 07h45 às 22h00 • intervalos de 15 minutos</Text>
    </View>
  );
  const SlotPicker = () => (
    <View>
      <DayPicker/>
      <Text style={[styles.sectionTitle,{marginTop:18}]}>Horários disponíveis</Text>
      <View style={styles.slotGrid}>
        {daySlots.map(t=><TouchableOpacity key={t.id} onPress={()=>setSlotId(String(t.id))} style={[styles.timeCell,slotId===String(t.id)&&styles.timeCellActive]}>
          <Text style={[styles.timeCellText,slotId===String(t.id)&&{color:'#fff'}]}>{new Date(t.inicio).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</Text>
          <Text style={[styles.timeCellHint,slotId===String(t.id)&&{color:'#FFE3E7'}]}>{t.vagas} vagas</Text>
        </TouchableOpacity>)}
      </View>
      {!daySlots.length && <Text style={styles.empty}>Nenhum horário disponível neste dia. Selecione outra data ou solicite à cantina a abertura de novos horários.</Text>}
      <Btn title="Atualizar disponibilidade" secondary onPress={()=>loadSlots().catch(e=>Alert.alert('Erro',e.message))}/>
    </View>
  );
  const ProductCard = ({ item }) => (
    <View style={styles.productCard}>
      {item.imagem_url ? <Image source={{uri:item.imagem_url}} style={styles.productImage} resizeMode="cover" /> : <View style={[styles.productImage,styles.imagePlaceholder]}><Text>🍽️</Text></View>}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.nome}</Text>
        <Text style={styles.muted} numberOfLines={2}>{item.descricao || item.categoria_nome}</Text>
        <Text style={styles.price}>{money(item.preco)}</Text>
        <TouchableOpacity onPress={async()=>{try{await api(`/favorites/${item.id}`,{method:'POST'});Alert.alert('Favorito','Produto salvo!')}catch(e){Alert.alert('Erro',e.message)}}}><Text style={styles.muted}>♡ Salvar favorito</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>{setReviewProduct(item);setReviewText('');go('review')}}><Text style={styles.muted}>★ Avaliar produto</Text></TouchableOpacity>
        <Btn title={item.disponivel ? 'Adicionar +' : 'Indisponível'} onPress={()=>addToCart(item)} disabled={!item.disponivel}/>
      </View>
    </View>
  );
  const TopNav = () => (
    <View style={styles.topShell}>
      <View style={styles.topBrandRow}>
        <TouchableOpacity onPress={()=>go('home')} style={styles.topBrand}>
          <View style={styles.topLogo}><Text style={{color:'#fff',fontWeight:'900',fontSize:19}}>S</Text></View>
          <View><Text style={styles.topBrandTitle}>SENAI <Text style={{color:RED}}>EXPRESS</Text></Text><Text style={styles.topBrandSub}>Cantina inteligente • V6 Studio</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.topIcon} onPress={()=>go('notifications')}><Text style={{fontSize:20}}>🔔</Text></TouchableOpacity>
        <TouchableOpacity style={styles.topIcon} onPress={()=>go('cart')}><Text style={{fontSize:20}}>🛒</Text>{cart.length>0&&<View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cart.reduce((n,p)=>n+p.quantidade,0)}</Text></View>}</TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topTabs}>
        {[
          ['home','⌂','Início'],['menu','▦','Cardápio'],['cart','🛍','Carrinho'],['orders','▤','Pedidos'],['profile','◉','Perfil']
        ].map(([id,icon,label])=><TouchableOpacity key={id} onPress={()=>go(id)} style={[styles.topTab,screen===id&&styles.topTabActive]}>
          <Text style={[styles.topTabText,screen===id&&styles.topTabTextActive]}>{icon}  {label}</Text>
        </TouchableOpacity>)}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {user?.funcao === "aluno" && screen !== "auth" && <TopNav/>}
      {screen === 'auth' && (
        <ScrollView contentContainerStyle={styles.authWrap}>
          <View style={styles.brandCircle}><Text style={styles.brandMark}>S</Text></View>
          <Text style={styles.brand}>SENAI <Text style={{color:RED}}>Express</Text></Text>
          <Text style={styles.tagline}>Seu intervalo. Seu pedido. Sem filas.</Text>
          <View style={styles.authCard}>
            <Text style={styles.screenTitle}>{authMode === 'store' ? 'Painel da loja' : authMode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta'}</Text>
            {authMode === 'register' && <TouchableOpacity style={styles.avatarPicker} onPress={()=>choosePhoto(true)}>
              {signupPhoto ? <Image source={{uri:signupPhoto}} style={styles.avatarPhoto}/> : <Text style={styles.avatarIcon}>📷</Text>}
              <Text style={styles.avatarLabel}>{photoBusy?'Enviando foto...':signupPhoto?'Alterar foto':'Adicionar foto ao cadastro'}</Text>
            </TouchableOpacity>}
            {authMode === 'register' && <TextInput style={styles.input} placeholder="Nome completo" value={nome} onChangeText={setNome} />}
            {authMode === 'store' && <Text style={styles.storeHint}>Entre com o e-mail e a senha de administrador configurados pelo responsável da cantina.</Text>}
            <TextInput style={styles.input} placeholder="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/>
            <TextInput style={styles.input} placeholder="Senha (mínimo 8 caracteres)" secureTextEntry value={senha} onChangeText={setSenha}/>
            <Btn title={loading ? 'Aguarde...' : authMode === 'store' ? 'Entrar no painel' : authMode === 'login' ? 'Entrar' : 'Cadastrar'} onPress={submitAuth} disabled={loading}/>
            <TouchableOpacity onPress={()=>setAuthMode(authMode==='register'?'login':authMode==='store'?'login':'register')} style={{padding:12}}>
              <Text style={styles.link}>{authMode === 'register' ? 'Já tem conta? Faça login' : authMode === 'store' ? 'Voltar para acesso de cliente' : 'Não tem conta? Cadastre-se'}</Text>
            </TouchableOpacity>
            {authMode !== 'register' && (
              <TouchableOpacity onPress={()=>{setAuthMode(authMode==='store'?'login':'store');setEmail('');setSenha('');}} style={styles.storeAccess}>
                <Text style={styles.storeAccessText}>{authMode === 'store' ? '← Voltar' : '🔒 Acesso exclusivo da loja'}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.footer}>Pedidos digitais para a cantina do SENAI</Text>
        </ScrollView>
      )}

      {screen === 'home' && (
        <ScrollView>
          <View style={styles.homeHero}><View style={styles.heroOrb}/><View style={styles.heroOrbSmall}/><Text style={styles.heroEyebrow}>✦  PEDIDOS SEM FILAS  ✦</Text>
            <Text style={styles.hello}>Olá, {user?.nome?.split(' ')[0] || 'aluno'} 👋</Text>
            <Text style={styles.heroTitle}>Seu intervalo merece algo incrível.</Text>
            <Text style={styles.heroSub}>Escolha. Personalize. Peça. Retire. Tudo na palma da mão.</Text>
            <Btn title="🔔 Notificações" secondary onPress={()=>go('notifications')}/>
            <Btn title="Ver cardápio →" onPress={()=>go('menu')}/>
          </View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Explore por categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(c=><TouchableOpacity key={c.id} style={styles.categoryPill} onPress={()=>{setCategory(c.slug);go('menu')}}><Text style={styles.categoryText}>{c.nome}</Text></TouchableOpacity>)}
            </ScrollView>
          </View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Mais pedidos</Text>
            {products.slice(0,4).map(p=><ProductCard key={p.id} item={p}/>)}
          </View>

        </ScrollView>
      )}

      {screen === 'menu' && (
        <View style={{flex:1}}>
          <Header title="Cardápio"/>
          <View style={styles.section}>
            <TextInput style={styles.input} placeholder="Buscar produto..." value={search} onChangeText={setSearch}/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}}>
              <TouchableOpacity style={styles.categoryPill} onPress={()=>setCategory('all')}><Text style={styles.categoryText}>Todos</Text></TouchableOpacity>
              {categories.map(c=><TouchableOpacity key={c.id} style={[styles.categoryPill,category===c.slug&&styles.categoryPillActive]} onPress={()=>setCategory(c.slug)}><Text style={[styles.categoryText,category===c.slug&&{color:'#fff'}]}>{c.nome}</Text></TouchableOpacity>)}
            </ScrollView>
          </View>
          <FlatList data={shownProducts} keyExtractor={i=>String(i.id)} renderItem={({item})=><ProductCard item={item}/>} contentContainerStyle={{paddingHorizontal:16,paddingBottom:20}} ListEmptyComponent={<Text style={styles.muted}>Nenhum produto encontrado.</Text>}/>

        </View>
      )}

      {screen === 'cart' && (
        <ScrollView>
          <Header title="Meu carrinho"/>
          <View style={styles.section}>
            {!cart.length && <Text style={styles.empty}>Seu carrinho está vazio.</Text>}
            {cart.map(i=><View key={i.id} style={styles.cartRow}>{i.imagem_url ? <Image source={{uri:i.imagem_url}} style={styles.cartThumb}/> : <View style={[styles.cartThumb,styles.imagePlaceholder]}><Text>🍔</Text></View>}
              <View style={{flex:1}}><Text style={styles.productName}>{i.nome}</Text><Text style={styles.price}>{money(i.preco*i.quantidade)}</Text></View>
              <TouchableOpacity style={styles.qty} onPress={()=>changeQty(i.id,-1)}><Text style={styles.qtyText}>−</Text></TouchableOpacity>
              <Text style={styles.qtyNumber}>{i.quantidade}</Text>
              <TouchableOpacity style={styles.qty} onPress={()=>changeQty(i.id,1)}><Text style={styles.qtyText}>+</Text></TouchableOpacity>
            </View>)}
            <View style={styles.totalRow}><Text style={styles.sectionTitle}>Total</Text><Text style={styles.price}>{money(cartTotal)}</Text></View>
            <Btn title="Continuar para retirada" onPress={()=>go('checkout')} disabled={!cart.length}/>
            <Btn title="Voltar ao cardápio" secondary onPress={()=>go('menu')}/>
          </View>

        </ScrollView>
      )}

      {screen === 'checkout' && (
        <ScrollView>
          <Header title="Finalizar pedido" back="cart"/>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escolha o horário</Text>
            <SlotPicker/>
            <Text style={[styles.sectionTitle,{marginTop:18}]}>Forma de pagamento</Text>
            <TouchableOpacity onPress={()=>setPayment('pix_simulado')} style={[styles.slot,payment==='pix_simulado'&&styles.slotSelected]}><Text style={styles.productName}>Pix simulado</Text><Text style={styles.muted}>Aprovação demonstrativa, sem cobrança real</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setPayment('cartao_simulado')} style={[styles.slot,payment==='cartao_simulado'&&styles.slotSelected]}><Text style={styles.productName}>💳 Cartão (simulação)</Text><Text style={styles.muted}>Aprovação demonstrativa, sem cobrança real</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setPayment('pagar_na_retirada')} style={[styles.slot,payment==='pagar_na_retirada'&&styles.slotSelected]}><Text style={styles.productName}>💵 Pagar na retirada</Text><Text style={styles.muted}>Pagamento registrado para o balcão</Text></TouchableOpacity>
            <View style={styles.totalRow}><Text style={styles.sectionTitle}>Total</Text><Text style={styles.price}>{money(cartTotal)}</Text></View>
            <Btn title={loading?'Processando...':'Confirmar pedido'} onPress={checkout} disabled={loading}/>
          </View>
        </ScrollView>
      )}

      {screen === 'success' && (
        <View style={styles.successWrap}>
          <Text style={{fontSize:56}}>🎉</Text><Text style={styles.screenTitle}>Pedido recebido!</Text>
          <Text style={styles.muted}>Apresente o código na retirada.</Text>
          <View style={styles.ticket}><Text style={styles.muted}>CÓDIGO DE RETIRADA</Text><Text style={styles.ticketCode}>{lastOrder?.codigo_retirada || '----'}</Text><Text style={styles.price}>{money(lastOrder?.total)}</Text><Text style={styles.muted}>Pagamento: {lastOrder?.pagamento === 'simulado_aprovado' ? 'Pagamento simulado aprovado' : 'Pendente na retirada'}</Text>{lastOrder?.pix_copia_cola ? <View style={styles.pixBox}><Text style={styles.muted}>PIX DEMONSTRATIVO (NÃO PAGÁVEL)</Text><Text selectable style={styles.pixCode}>{lastOrder.pix_copia_cola}</Text></View> : null}</View>
          <Btn title="Acompanhar meus pedidos" onPress={()=>go('orders')}/><Btn title="Voltar ao início" secondary onPress={()=>go('home')}/>
        </View>
      )}

      {screen === 'orders' && (
        <ScrollView>
          <Header title="Meus pedidos"/>
          <View style={styles.section}>
            <Btn title="Atualizar pedidos" secondary onPress={()=>loadOrders().catch(e=>Alert.alert('Erro',e.message))}/>
            {!orders.length && <Text style={styles.empty}>Você ainda não fez pedidos.</Text>}
            {orders.map(o=><View key={o.id} style={styles.orderCard}>
              <View style={styles.rowBetween}><Text style={styles.productName}>Pedido #{o.id}</Text><Text style={styles.price}>{money(o.total)}</Text></View>
              <Text style={styles.muted}>Código: {o.codigo_retirada}</Text><Text style={styles.status}>{statusLabel[o.status] || o.status}</Text>
              {(o.itens||[]).map((i,idx)=><Text key={idx} style={styles.muted}>{i.quantidade}x {i.nome_produto}</Text>)}
              <Text style={styles.muted}>{new Date(o.criado_em).toLocaleString('pt-BR')}</Text>
            </View>)}
          </View>

        </ScrollView>
      )}

      {screen === 'profile' && <ScrollView style={{backgroundColor:'#F8F9FB'}}><Header title="Minha conta"/><View style={styles.profilePage}>
        <View style={styles.profileHero}>
          {/^https?:\/\//.test(profilePhoto) ? <Image source={{uri:profilePhoto}} style={styles.profileAvatar}/> : <View style={[styles.profileAvatar,{backgroundColor:'#FFE4E7',alignItems:'center',justifyContent:'center'}]}><Text style={{fontSize:28,fontWeight:'900',color:RED}}>{(profile?.nome||user?.nome||'U').slice(0,1).toUpperCase()}</Text></View>}
          <View style={{flex:1}}><Text style={styles.profileHello}>MINHA CONTA</Text><Text style={styles.profileName}>{profile?.nome||user?.nome||'Usuário'}</Text><Text style={styles.profileEmail}>{profile?.email||user?.email||''}</Text></View>
          <TouchableOpacity onPress={()=>go('editProfile')} style={styles.editChip}><Text style={{color:RED,fontWeight:'800'}}>Editar</Text></TouchableOpacity>
        </View>
        <Text style={styles.menuGroupLabel}>COMPRAS E AGENDAMENTOS</Text>
        <View style={styles.menuGroup}>
          <MenuEntry icon="▤" title="Meus pedidos" subtitle="Histórico, valores e acompanhamento" onPress={()=>go('orders')}/>
          <MenuEntry icon="▦" title="Agendar retirada" subtitle="Calendário e horários disponíveis" onPress={()=>go('schedule')}/>
          <MenuEntry icon="♡" title="Meus favoritos" subtitle="Seus produtos preferidos" onPress={()=>go('favorites')}/>
        </View>
        <Text style={styles.menuGroupLabel}>BENEFÍCIOS E COMUNICAÇÃO</Text>
        <View style={styles.menuGroup}>
          <MenuEntry icon="♧" title="Pontos e carteira" subtitle="Saldo e benefícios demonstrativos" onPress={()=>go('loyalty')}/>
          <MenuEntry icon="♢" title="Notificações" subtitle="Atualizações e avisos importantes" onPress={()=>go('notifications')}/>
          <MenuEntry icon="✉" title="Central de suporte" subtitle="Envie e acompanhe solicitações" onPress={()=>go('support')}/>
        </View>
        <Text style={styles.menuGroupLabel}>CONFIGURAÇÕES</Text>
        <View style={styles.menuGroup}>
          <MenuEntry icon="⚙" title="Dados pessoais" subtitle="Nome, e-mail e foto do perfil" onPress={()=>go('editProfile')}/>
          <MenuEntry icon="↪" title="Sair da conta" subtitle="Encerrar sessão neste dispositivo" onPress={()=>Alert.alert('Sair da conta','Deseja realmente sair?',[{text:'Cancelar',style:'cancel'},{text:'Sair',style:'destructive',onPress:logout}])}/>
        </View>
      </View></ScrollView>}
      {screen === 'editProfile' && <ScrollView style={{backgroundColor:'#F8F9FB'}}><Header title="Editar perfil" back="profile"/><View style={styles.section}>
        <View style={styles.menuGroup}><View style={{padding:18}}>
          {/^https?:\/\//.test(profilePhoto)&&<Image source={{uri:profilePhoto}} style={[styles.profileAvatar,{alignSelf:'center',marginBottom:16,width:90,height:90,borderRadius:45}]}/>}
          <Text style={styles.formLabel}>Nome completo</Text><TextInput style={styles.input} value={profileName} onChangeText={setProfileName} placeholder="Seu nome"/>
          <Text style={styles.formLabel}>E-mail cadastrado</Text><Text style={[styles.profileEmail,{marginBottom:14}]}>{profile?.email||user?.email}</Text>
          <Btn title={photoBusy?'Enviando foto...':'Alterar foto da galeria'} secondary disabled={photoBusy} onPress={()=>choosePhoto(false)}/>
          <Btn title="Salvar alterações" onPress={async()=>{await saveProfile();go('profile')}}/>
        </View></View>
      </View></ScrollView>}
      {screen === 'schedule' && <ScrollView style={{backgroundColor:'#F8F9FB'}}><Header title="Agendar retirada" back="profile"/><View style={styles.section}>
        <Text style={styles.menuSubtitle}>Escolha um horário para retirar seu pedido. A disponibilidade é consultada diretamente no banco.</Text>
        <SlotPicker/>
        <View style={styles.menuGroup}><View style={{padding:16}}><Text style={styles.menuTitle}>Próximo passo</Text><Text style={styles.menuSubtitle}>Para confirmar uma reserva, adicione produtos ao carrinho e finalize o pedido.</Text><Btn title="Ir para o cardápio" onPress={()=>go('menu')}/><Btn title="Ver carrinho" secondary onPress={()=>go('cart')}/></View></View>
      </View></ScrollView>}
      {screen === 'notifications' && <ScrollView><Header title="Notificações" back="profile"/><View style={styles.section}>
        {!notifications.length && <Text style={styles.empty}>Nenhuma notificação por enquanto.</Text>}
        {notifications.map(n=><TouchableOpacity key={n.id} style={styles.orderCard} onPress={async()=>{try{await api(`/notifications/${n.id}/read`,{method:'PATCH'});setNotifications(old=>old.map(x=>x.id===n.id?{...x,lida:true}:x));}catch(e){Alert.alert('Erro',e.message)}}}>
          <Text style={styles.productName}>{n.lida?'✓ ':'● '}{n.titulo}</Text><Text style={styles.muted}>{n.mensagem}</Text>
        </TouchableOpacity>)}
      </View></ScrollView>}
      {screen === 'audit' && user?.funcao==='admin' && <ScrollView><Header title="Auditoria da loja" back="admin"/><View style={styles.section}>
        <Text style={styles.sectionTitle}>Alterações administrativas</Text>
        {!audit.length && <Text style={styles.muted}>Nenhuma alteração registrada.</Text>}
        {audit.map(a=><View key={a.id} style={styles.orderCard}><Text style={styles.productName}>{a.acao} · {a.entidade} #{a.entidade_id}</Text><Text style={styles.muted}>{a.responsavel||'Administrador'} · {String(a.criado_em)}</Text><Text style={styles.muted}>{a.detalhes}</Text></View>)}
        <Text style={styles.sectionTitle}>Pagamentos registrados (simulação)</Text>
        {transactions.map(x=><View key={x.id} style={styles.orderCard}><Text style={styles.productName}>Pedido #{x.pedido_id} · {money(x.valor)}</Text><Text style={styles.muted}>{x.metodo} · {x.status} · {x.referencia}</Text></View>)}
      </View></ScrollView>}
      {screen === 'favorites' && <ScrollView><Header title="Meus favoritos" back="profile"/><View style={styles.section}>{favorites.length===0&&<Text style={styles.empty}>Nenhum favorito.</Text>}{favorites.map(p=><View key={p.id} style={styles.orderCard}><Text style={styles.productName}>{p.nome} · {money(p.preco)}</Text><Btn title="Adicionar ao carrinho" onPress={()=>addToCart(p)}/><Btn title="Remover" secondary onPress={async()=>{await api(`/favorites/${p.id}`,{method:'DELETE'});setFavorites(x=>x.filter(y=>y.id!==p.id))}}/></View>)}</View></ScrollView>}
      {screen === 'loyalty' && <ScrollView><Header title="Pontos e carteira" back="profile"/><View style={styles.section}><Text style={styles.sectionTitle}>Pontos: {loyalty?.pontos??'...'}</Text><Text style={styles.sectionTitle}>Saldo fictício: {money(loyalty?.carteira_demo)}</Text><Text style={styles.muted}>Carteira demonstrativa: não representa dinheiro real e não processa pagamentos.</Text></View></ScrollView>}
      {screen === 'review' && <ScrollView><Header title="Avaliar produto" back="menu"/><View style={styles.section}><Text style={styles.sectionTitle}>{reviewProduct?.nome}</Text><Text style={styles.formLabel}>Nota de 1 a 5</Text><TextInput style={styles.input} keyboardType="number-pad" value={reviewRating} onChangeText={setReviewRating}/><TextInput style={styles.input} placeholder="Comentário (opcional)" value={reviewText} onChangeText={setReviewText}/><Btn title="Publicar avaliação" onPress={async()=>{try{await api(`/products/${reviewProduct.id}/reviews`,{method:'PUT',body:JSON.stringify({nota:Number(reviewRating),comentario:reviewText})});Alert.alert('Obrigado!','Avaliação registrada.');go('menu')}catch(e){Alert.alert('Erro',e.message)}}}/></View></ScrollView>}
      {screen === 'support' && <ScrollView><Header title="Central de suporte" back="profile"/><View style={styles.section}><TextInput style={styles.input} placeholder="Assunto" value={supportSubject} onChangeText={setSupportSubject}/><TextInput style={styles.input} placeholder="Descreva o problema" multiline value={supportMessage} onChangeText={setSupportMessage}/><Btn title="Abrir chamado" onPress={async()=>{try{await api('/support',{method:'POST',body:JSON.stringify({assunto:supportSubject,mensagem:supportMessage})});setSupportSubject('');setSupportMessage('');setSupportTickets(await api('/support'));Alert.alert('Enviado','Chamado registrado.')}catch(e){Alert.alert('Erro',e.message)}}}/>{supportTickets.map(t=><View key={t.id} style={styles.orderCard}><Text style={styles.productName}>{t.assunto} · {t.status}</Text><Text style={styles.muted}>{t.mensagem}</Text></View>)}</View></ScrollView>}
      {screen === 'slotsAdmin' && user?.funcao==='admin' && <ScrollView><Header title="Gerenciar horários" back="admin"/><View style={styles.section}><Text style={styles.menuTitle}>Gerar agenda completa</Text><Text style={styles.menuSubtitle}>Cria horários a cada 15 minutos, de 07h45 a 22h00, sem duplicar os já cadastrados.</Text><TextInput style={styles.input} placeholder="Data: AAAA-MM-DD" value={adminDay} onChangeText={setAdminDay}/><TextInput style={styles.input} placeholder="Capacidade por horário" keyboardType="number-pad" value={slotCapacity} onChangeText={setSlotCapacity}/><Btn title="Gerar horários do dia" onPress={async()=>{try{const r=await api('/admin/slots/generate',{method:'POST',body:JSON.stringify({data:adminDay,capacidade:Number(slotCapacity)})});setAdminSlots(await api('/admin/slots'));Alert.alert('Agenda atualizada',`${r.criados} horários criados. ${r.existentes} já existiam.`)}catch(e){Alert.alert('Erro',e.message)}}}/><Text style={[styles.menuGroupLabel,{marginTop:24}]}>CRIAR HORÁRIO AVULSO</Text><Text style={styles.muted}>Formato: AAAA-MM-DD HH:MM:SS</Text><TextInput style={styles.input} placeholder="Início: 2026-11-06 10:00:00" value={slotStart} onChangeText={setSlotStart}/><TextInput style={styles.input} placeholder="Fim: 2026-11-06 10:15:00" value={slotEnd} onChangeText={setSlotEnd}/><TextInput style={styles.input} placeholder="Capacidade" keyboardType="number-pad" value={slotCapacity} onChangeText={setSlotCapacity}/><Btn title="Criar horário" onPress={async()=>{try{await api('/admin/slots',{method:'POST',body:JSON.stringify({inicio:slotStart,fim:slotEnd,capacidade:Number(slotCapacity)})});setAdminSlots(await api('/admin/slots'));Alert.alert('Salvo','Horário cadastrado')}catch(e){Alert.alert('Erro',e.message)}}}/>{adminSlots.map(s=><View key={s.id} style={styles.orderCard}><Text style={styles.productName}>{String(s.inicio)} · {s.capacidade} vagas</Text><Text style={styles.muted}>{s.ativo?'Ativo':'Desativado'}</Text><Btn title={s.ativo?'Desativar':'Ativar'} secondary onPress={async()=>{await api(`/admin/slots/${s.id}`,{method:'PATCH',body:JSON.stringify({ativo:!s.ativo})});setAdminSlots(await api('/admin/slots'))}}/></View>)}</View></ScrollView>}
      {screen === 'analytics' && user?.funcao==='admin' && <ScrollView><Header title="Relatórios" back="admin"/><View style={styles.section}><Text style={styles.sectionTitle}>Últimos 30 dias — valores simulados</Text>{(adminAnalytics?.diario||[]).map((r,i)=><View key={i} style={styles.orderCard}><Text>{String(r.dia).slice(0,10)} · {r.pedidos} pedidos · {money(r.valor_simulado)}</Text></View>)}<Text style={styles.sectionTitle}>Estoque baixo</Text>{(adminAnalytics?.estoque_baixo||[]).map(r=><Text key={r.id} style={styles.muted}>{r.nome}: {r.estoque} unidades</Text>)}</View></ScrollView>}
      {screen === 'admin' && (
        <ScrollView>
          <Header title="Painel administrativo" back="admin"/>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visão geral</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statNumber}>{summary?.total_pedidos ?? '—'}</Text><Text style={styles.muted}>Pedidos</Text></View>
              <View style={styles.stat}><Text style={styles.statNumber}>{money(summary?.valor_pedidos)}</Text><Text style={styles.muted}>Valor registrado</Text></View>
              <View style={styles.stat}><Text style={styles.statNumber}>{summary?.total_produtos ?? '—'}</Text><Text style={styles.muted}>Produtos</Text></View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.statNumber}>{summary?.pedidos_hoje ?? '—'}</Text><Text style={styles.muted}>Pedidos hoje</Text></View>
              <View style={styles.stat}><Text style={styles.statNumber}>{money(summary?.faturamento_hoje)}</Text><Text style={styles.muted}>Vendas hoje</Text></View>
              <View style={styles.stat}><Text style={styles.statNumber}>{summary?.pedidos_pendentes ?? '—'}</Text><Text style={styles.muted}>Em andamento</Text></View>
            </View>
            <Btn title="Agenda de horários" secondary onPress={()=>go('slotsAdmin')}/>
            <Btn title="Relatórios de vendas" secondary onPress={()=>go('analytics')}/>
            <Btn title="Auditoria e transações" secondary onPress={()=>go('audit')}/>
            <Btn title="Atualizar painel" secondary onPress={()=>loadAdmin().catch(e=>Alert.alert('Erro',e.message))}/>
            <Text style={[styles.sectionTitle,{marginTop:22}]}>Cadastrar produto</Text>
            <View style={styles.adminForm}>
              <TextInput style={styles.input} placeholder="Nome do produto" value={newProductName} onChangeText={setNewProductName}/>
              <TextInput style={styles.input} placeholder="Descrição" value={newProductDescription} onChangeText={setNewProductDescription}/>
              <TextInput style={styles.input} placeholder="Preço (ex.: 8,50)" keyboardType="decimal-pad" value={newProductPrice} onChangeText={setNewProductPrice}/>
              <Text style={styles.formLabel}>Categoria (ID)</Text>
              <View style={styles.actionWrap}>
                {categories.map(c=><TouchableOpacity key={c.id} onPress={()=>setNewProductCategory(String(c.id))} style={[styles.smallAction,newProductCategory===String(c.id)&&styles.smallActionActive]}><Text style={styles.smallActionText}>{c.nome}</Text></TouchableOpacity>)}
              </View>
              <TextInput style={styles.input} placeholder="URL da imagem (opcional)" autoCapitalize="none" value={newProductImage} onChangeText={setNewProductImage}/>
              <TextInput style={styles.input} placeholder="Estoque (vazio = sem limite)" keyboardType="number-pad" value={newProductStock} onChangeText={setNewProductStock}/>
              <Btn title={loading?'Salvando...':'Cadastrar produto'} onPress={createProduct} disabled={loading}/>
            </View>
            <Text style={[styles.sectionTitle,{marginTop:22}]}>Produtos do cardápio</Text>
            {products.map(p=><View key={p.id} style={styles.manageProductRow}>
              <View style={{flex:1}}>
                <Text style={styles.productName}>{p.nome}</Text>
                <Text style={styles.muted}>{money(p.preco)} · {p.categoria_nome}</Text>
              </View>
              <TouchableOpacity onPress={()=>startEdit(p)} style={styles.smallAction}><Text style={styles.smallActionText}>Editar</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>toggleProductAvailability(p)} style={[styles.smallAction,!p.disponivel&&styles.smallActionActive]}>
                <Text style={styles.smallActionText}>{p.disponivel?'Pausar':'Ativar'}</Text>
              </TouchableOpacity>
            </View>)}
            {editProduct && <View style={styles.adminForm}>
              <Text style={styles.sectionTitle}>Editando #{editProduct.id}</Text>
              <TextInput style={styles.input} placeholder="Nome" value={editName} onChangeText={setEditName}/>
              <TextInput style={styles.input} placeholder="Descrição" value={editDescription} onChangeText={setEditDescription}/>
              <TextInput style={styles.input} placeholder="Preço" keyboardType="decimal-pad" value={editPrice} onChangeText={setEditPrice}/>
              <TextInput style={styles.input} placeholder="Estoque (vazio = ilimitado)" keyboardType="number-pad" value={editStock} onChangeText={setEditStock}/>
              <Btn title="Salvar alterações" onPress={saveEdit}/><Btn title="Cancelar" secondary onPress={()=>setEditProduct(null)}/>
            </View>}
            <Text style={[styles.sectionTitle,{marginTop:22}]}>Pedidos recebidos</Text>
            {!adminOrders.length && <Text style={styles.empty}>Nenhum pedido encontrado.</Text>}
            {adminOrders.map(o=><View key={o.id} style={styles.orderCard}>
              <Text style={styles.productName}>Pedido #{o.id} · {o.cliente}</Text><Text style={styles.muted}>{o.email}</Text>
              <Text style={styles.status}>{statusLabel[o.status] || o.status} · {money(o.total)}</Text>
              {(o.itens||[]).map((i,idx)=><Text key={idx} style={styles.muted}>{i.quantidade}x {i.nome_produto}</Text>)}
              <View style={styles.actionWrap}>
                {['confirmado','em_preparo','pronto','entregue','cancelado'].map(s=><TouchableOpacity key={s} onPress={()=>adminStatus(o.id,s)} style={styles.smallAction}><Text style={styles.smallActionText}>{s.replace('_',' ')}</Text></TouchableOpacity>)}
              </View>
            </View>)}
            <Text style={[styles.sectionTitle,{marginTop:18}]}>Mais vendidos</Text>
            {(summary?.mais_vendidos||[]).map((p,i)=><Text key={i} style={styles.muted}>{p.nome_produto}: {p.quantidade} unidade(s)</Text>)}
            <Text style={styles.tip}>Os registros de auditoria mostram as alterações realizadas a partir desta versão.</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profilePage:{padding:16,paddingBottom:40},
  profileHero:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:'#fff',padding:17,borderRadius:20,borderWidth:1,borderColor:'#EBEDF1',marginBottom:24},
  profileAvatar:{width:60,height:60,borderRadius:30},
  profileHello:{fontSize:10,color:'#8B929D',fontWeight:'900',letterSpacing:1.2},
  profileName:{fontSize:18,color:'#1E2430',fontWeight:'900',marginTop:3},
  profileEmail:{fontSize:12,color:'#737B88',marginTop:4},
  editChip:{paddingHorizontal:12,paddingVertical:9,backgroundColor:'#FFF0F2',borderRadius:12},
  menuGroupLabel:{fontSize:11,fontWeight:'900',color:'#8B929D',letterSpacing:1,marginLeft:5,marginBottom:10},
  menuGroup:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:'#EBEDF1',marginBottom:24,overflow:'hidden'},
  menuEntry:{flexDirection:'row',alignItems:'center',paddingHorizontal:15,paddingVertical:16,borderBottomWidth:1,borderBottomColor:'#F2F3F6',gap:12},
  menuIcon:{width:40,height:40,borderRadius:12,backgroundColor:'#FFF1F3',alignItems:'center',justifyContent:'center'},
  menuIconText:{fontSize:21,fontWeight:'700',color:RED},
  menuTitle:{fontSize:14,fontWeight:'800',color:'#242A35'},
  menuSubtitle:{fontSize:12,color:'#7B8491',marginTop:4,lineHeight:18},
  menuChevron:{fontSize:25,color:'#AAB0BA',fontWeight:'400'},
  calendarPanel:{backgroundColor:'#fff',borderWidth:1,borderColor:'#EBEDF1',borderRadius:18,padding:14,marginTop:16},
  calendarTitle:{fontSize:16,fontWeight:'900',color:'#242A35'},
  calendarArrow:{fontSize:30,color:RED,fontWeight:'700',paddingHorizontal:8},
  calendarDay:{width:48,alignItems:'center',justifyContent:'center',paddingVertical:10,borderRadius:12,backgroundColor:'#F5F6F8'},
  calendarDayActive:{backgroundColor:RED},
  calendarDayText:{fontSize:11,color:'#737B88',fontWeight:'700'},
  calendarDayTextActive:{color:'#fff'},
  calendarNumber:{fontSize:18,color:'#242A35',fontWeight:'900',marginTop:3},
  slotGrid:{flexDirection:'row',flexWrap:'wrap',gap:9},
  timeCell:{width:'30%',borderWidth:1,borderColor:'#E4E6EB',backgroundColor:'#fff',borderRadius:12,alignItems:'center',paddingVertical:12},
  timeCellActive:{backgroundColor:RED,borderColor:RED},
  timeCellText:{fontWeight:'900',fontSize:15,color:'#27303B'},
  timeCellHint:{fontSize:10,color:'#8B929D',marginTop:4},

  topShell:{backgroundColor:'#FFFFFF',borderBottomWidth:1,borderColor:'#F0E7E8',paddingTop:8,shadowColor:'#241015',shadowOffset:{width:0,height:6},shadowOpacity:0.08,shadowRadius:14,elevation:7,zIndex:5},
  topBrandRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingBottom:12,gap:9},
  topBrand:{flex:1,flexDirection:'row',alignItems:'center',gap:9},
  topLogo:{width:39,height:39,borderRadius:13,backgroundColor:RED,alignItems:'center',justifyContent:'center',transform:[{rotate:'-7deg'}],elevation:4},
  topBrandTitle:{fontSize:16,fontWeight:'900',color:'#17171D',letterSpacing:-0.6},
  topBrandSub:{fontSize:10,color:'#8A8186',marginTop:2},
  topIcon:{width:39,height:39,borderRadius:13,backgroundColor:'#FAF2F3',alignItems:'center',justifyContent:'center',position:'relative'},
  cartBadge:{position:'absolute',top:-5,right:-4,minWidth:19,height:19,borderRadius:10,backgroundColor:RED,alignItems:'center',justifyContent:'center',paddingHorizontal:3},
  cartBadgeText:{color:'#fff',fontSize:10,fontWeight:'900'},
  topTabs:{paddingHorizontal:12,paddingBottom:9,gap:5},
  topTab:{paddingHorizontal:13,paddingVertical:9,borderRadius:12,backgroundColor:'#F8F6F7'},
  topTabActive:{backgroundColor:RED,elevation:3},
  topTabText:{fontSize:12,color:'#665D64',fontWeight:'800'},
  topTabTextActive:{color:'#fff'},
  heroOrb:{position:'absolute',right:-62,top:-75,width:230,height:230,borderRadius:115,backgroundColor:'#E94B5E',opacity:0.33},
  heroOrbSmall:{position:'absolute',right:25,bottom:-55,width:135,height:135,borderRadius:68,backgroundColor:'#FFFFFF',opacity:0.11},
  heroEyebrow:{color:'#FFE1E6',fontWeight:'900',fontSize:10,letterSpacing:2,marginBottom:12},
  avatarPicker:{alignItems:'center',padding:15,borderRadius:18,backgroundColor:'#FFF4F5',borderWidth:1,borderColor:'#F3D2D7',marginBottom:16},
  avatarIcon:{fontSize:37},avatarPhoto:{width:85,height:85,borderRadius:43},avatarLabel:{color:RED,fontWeight:'800',marginTop:8,fontSize:13},
  cartThumb:{width:64,height:64,borderRadius:13,backgroundColor:'#FFF0F1',marginRight:8},
  safe:{flex:1,backgroundColor:'#FCFAFB'},
  authWrap:{flexGrow:1,justifyContent:'center',padding:24,backgroundColor:'#FFF8F8'},
  brandCircle:{alignSelf:'center',width:76,height:76,borderRadius:24,backgroundColor:RED,alignItems:'center',justifyContent:'center',marginBottom:12},
  brandMark:{color:'#fff',fontSize:42,fontWeight:'900'},
  brand:{fontSize:30,fontWeight:'900',textAlign:'center',color:'#252525'},
  tagline:{textAlign:'center',color:'#777',marginTop:6,marginBottom:24},
  authCard:{backgroundColor:'#fff',borderRadius:20,padding:20,borderWidth:1,borderColor:'#F1D8DB'},
  screenTitle:{fontSize:24,fontWeight:'800',color:'#252525',marginBottom:16,textAlign:'center'},
  input:{borderWidth:1,borderColor:'#E6E6E6',borderRadius:12,paddingHorizontal:14,paddingVertical:13,marginBottom:12,fontSize:15,backgroundColor:'#fff',color:'#222'},
  button:{backgroundColor:RED,paddingVertical:14,paddingHorizontal:16,borderRadius:12,alignItems:'center',marginTop:8},
  buttonText:{color:'#fff',fontWeight:'800',fontSize:15},
  buttonSecondary:{backgroundColor:'#FFF0F1',borderWidth:1,borderColor:'#EFC5CA'},
  buttonSecondaryText:{color:RED},
  link:{color:RED,textAlign:'center',fontWeight:'700'},
  footer:{textAlign:'center',marginTop:22,color:'#888',fontSize:12},
  homeHero:{backgroundColor:'#B8192C',padding:25,paddingTop:29,borderBottomLeftRadius:32,borderBottomRightRadius:32,overflow:'hidden',minHeight:245},
  hello:{color:'#FFE1E5',fontWeight:'700',marginBottom:12},
  heroTitle:{fontSize:30,fontWeight:'900',color:'#FFFFFF',lineHeight:34},
  heroSub:{color:'#FFE5E9',marginTop:8,marginBottom:14,fontSize:15},
  section:{padding:16},
  sectionTitle:{fontSize:19,fontWeight:'800',color:'#242424',marginBottom:12},
  categoryPill:{borderWidth:1,borderColor:'#F0C6CB',backgroundColor:'#FFF5F6',borderRadius:20,paddingHorizontal:14,paddingVertical:10,marginRight:8,marginBottom:8},
  categoryPillActive:{backgroundColor:RED,borderColor:RED},
  categoryText:{color:RED,fontWeight:'700',fontSize:12},
  productCard:{flexDirection:'row',backgroundColor:'#fff',borderWidth:1,borderColor:'#F0E4E5',borderRadius:22,overflow:'hidden',marginBottom:15,minHeight:142,shadowColor:'#481922',shadowOffset:{width:0,height:6},shadowOpacity:0.09,shadowRadius:13,elevation:4},
  productImage:{width:112,height:142,backgroundColor:'#F7F0F0'},
  imagePlaceholder:{alignItems:'center',justifyContent:'center'},
  productInfo:{flex:1,padding:12,justifyContent:'center'},
  productName:{fontSize:15,fontWeight:'800',color:'#252525'},
  muted:{color:'#777',fontSize:12,marginTop:4},
  price:{fontSize:16,fontWeight:'900',color:RED,marginTop:6},
  nav:{flexDirection:'row',justifyContent:'space-around',paddingVertical:12,paddingHorizontal:4,borderTopWidth:1,borderColor:'#F1E3E4',backgroundColor:'#fff'},
  navItem:{fontSize:11,color:RED,fontWeight:'800'},
  header:{height:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,borderBottomWidth:1,borderColor:'#F2E5E6'},
  headerBack:{fontSize:32,color:RED,width:32},
  headerTitle:{fontSize:17,fontWeight:'800',color:'#222',flex:1,textAlign:'center'},
  headerExit:{color:RED,fontWeight:'700'},
  empty:{textAlign:'center',padding:28,color:'#777'},
  cartRow:{flexDirection:'row',alignItems:'center',paddingVertical:14,borderBottomWidth:1,borderColor:'#F2E5E6',gap:8},
  qty:{width:34,height:34,borderRadius:10,backgroundColor:'#FFF0F1',alignItems:'center',justifyContent:'center'},
  qtyText:{fontSize:22,color:RED,fontWeight:'700'},
  qtyNumber:{fontWeight:'800',minWidth:20,textAlign:'center'},
  totalRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:20},
  slot:{padding:14,borderWidth:1,borderColor:'#E9E0E1',borderRadius:12,marginBottom:10},
  slotSelected:{borderColor:RED,backgroundColor:'#FFF1F2'},
  successWrap:{flex:1,justifyContent:'center',padding:24,alignItems:'stretch'},
  ticket:{borderWidth:1,borderColor:'#F0C6CB',borderStyle:'dashed',borderRadius:18,padding:22,alignItems:'center',marginVertical:22,backgroundColor:'#FFF8F8'},
  ticketCode:{fontSize:38,fontWeight:'900',letterSpacing:5,color:RED,marginVertical:10},
  orderCard:{borderWidth:1,borderColor:'#F0E4E5',borderRadius:14,padding:14,marginBottom:12},
  rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  status:{color:RED,fontWeight:'800',marginTop:8,marginBottom:4},
  statsRow:{flexDirection:'row',gap:8,marginBottom:12},
  stat:{flex:1,backgroundColor:'#FFF2F3',borderRadius:12,padding:12},
  statNumber:{fontWeight:'900',fontSize:18,color:RED},
  actionWrap:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:10},
  smallAction:{paddingVertical:8,paddingHorizontal:9,backgroundColor:'#FFF0F1',borderRadius:9},
  smallActionText:{fontSize:10,color:RED,fontWeight:'800'},
  tip:{fontSize:12,color:'#777',lineHeight:18,marginTop:16},
  storeAccess:{marginTop:8,padding:14,borderRadius:12,borderWidth:1,borderColor:'#D9D9E2',backgroundColor:'#F7F7FA',alignItems:'center'},
  storeAccessText:{color:'#353545',fontWeight:'800',fontSize:13},
  storeHint:{fontSize:12,color:'#666',lineHeight:18,marginBottom:12,textAlign:'center'},
  adminForm:{padding:14,borderRadius:16,backgroundColor:'#FAF7F7',borderWidth:1,borderColor:'#F0E4E5'},
  formLabel:{fontSize:12,fontWeight:'800',color:'#555',marginBottom:8},
  smallActionActive:{backgroundColor:'#F4DDE0',borderWidth:1,borderColor:RED},
  pixBox:{marginTop:12,padding:12,borderRadius:10,backgroundColor:'#FFF0F1',width:'100%'},
  pixCode:{fontSize:11,color:'#6B1B25',marginTop:6},
  manageProductRow:{flexDirection:'row',alignItems:'center',paddingVertical:12,paddingHorizontal:12,borderRadius:12,borderWidth:1,borderColor:'#F0E4E5',marginBottom:8,backgroundColor:'#fff'}
});
