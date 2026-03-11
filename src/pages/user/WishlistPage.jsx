// src/pages/user/WishlistPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, onSnapshot, query, where, documentId } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../hooks/useWishlist';
import { useSEO } from '../../hooks/useSEO';
import AccountCard from '../../components/shared/AccountCard';
import { Heart, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';

const TS = { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' }};

const WishlistPage = ({ onAddToCart }) => {
  const { currentUser } = useAuth();
  const { wishlist, toggle, isWishlisted } = useWishlist(currentUser);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);

  // ✅ Realtime: remove sold accounts from wishlist display
  useEffect(() => {
    if (!accounts.length) return;
    const unsub = onSnapshot(
      query(collection(db,'accounts'), where('status','==','sold')),
      (snap) => {
        const soldIds = new Set(snap.docs.map(d=>d.id));
        if (soldIds.size) setAccounts(prev => prev.filter(a => !soldIds.has(a.id)));
      }, () => {}
    );
    return () => unsub();
  }, [accounts.length]);
  const navigate = useNavigate();
  useSEO({ title: 'Yêu thích', description: 'Danh sách tài khoản game đã lưu' });

  useEffect(() => {
    if (!wishlist.length) { setAccounts([]); setLoading(false); return; }
    setLoading(true);
    // Firestore 'in' operator max 30 items
    const chunks = [];
    for (let i = 0; i < wishlist.length; i += 30) chunks.push(wishlist.slice(i, i+30));
    Promise.all(chunks.map(chunk =>
      getDocs(query(collection(db,'accounts'), where(documentId(),'in',chunk)))
    )).then(snaps => {
      const items = snaps.flatMap(s => s.docs.map(d=>({id:d.id,...d.data()})));
      // preserve wishlist order
      items.sort((a,b) => wishlist.indexOf(a.id) - wishlist.indexOf(b.id));
      setAccounts(items);
    }).catch(console.error)
      .finally(()=>setLoading(false));
  }, [wishlist]);

  const handleToggleWishlist = async (id) => {
    const added = await toggle(id);
    toast.success(added ? '❤️ Đã thêm yêu thích' : 'Đã bỏ yêu thích', TS);
  };

  if (!currentUser) return (
    <div className="page-wrapper" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',gap:16}}>
      <Heart size={48} style={{opacity:.3}}/>
      <p style={{color:'var(--text-muted)'}}>Đăng nhập để xem danh sách yêu thích</p>
      <button className="btn btn-primary" onClick={()=>navigate('/login')}>Đăng nhập</button>
    </div>
  );

  return (
    <div className="page-wrapper" style={{padding:'30px 0 80px'}}>
      <div className="container">
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:28}}>
          <Heart size={22} style={{color:'#ff4757',fill:'#ff4757'}}/>
          <h1 style={{fontFamily:'Rajdhani',fontSize:26,fontWeight:700,margin:0}}>Yêu thích</h1>
          <span style={{fontSize:13,color:'var(--text-muted)'}}>({wishlist.length} sản phẩm)</span>
        </div>

        {loading ? (
          <div style={{textAlign:'center',padding:80}}><div className="spinner" style={{margin:'0 auto'}}/></div>
        ) : accounts.length === 0 ? (
          <div style={{textAlign:'center',padding:80,color:'var(--text-muted)'}}>
            <Heart size={56} style={{opacity:.2,marginBottom:20}}/>
            <p style={{fontSize:16,marginBottom:20}}>Chưa có sản phẩm yêu thích nào</p>
            <Link to="/shop" className="btn btn-primary"><ShoppingBag size={15}/> Khám phá Shop</Link>
          </div>
        ) : (
          <div className="accounts-grid">
            {accounts.map(acc => (
              <AccountCard
                key={acc.id}
                account={acc}
                onAddToCart={onAddToCart}
                isWishlisted={isWishlisted(acc.id)}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
