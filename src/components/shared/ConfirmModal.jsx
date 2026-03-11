// src/components/shared/ConfirmModal.jsx
// Drop-in replacement for window.confirm — works on mobile, styled consistently
import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Usage:
 *   const { confirm, ConfirmModal } = useConfirm();
 *   ...
 *   if (!(await confirm('Xóa item này?'))) return;
 *   ...
 *   return <> <ConfirmModal /> ... </>
 */
export const useConfirm = () => {
  const [state, setState] = React.useState(null); // {msg, resolve, variant}

  const confirm = React.useCallback((msg, variant = 'danger') => {
    return new Promise((resolve) => {
      setState({ msg, resolve, variant });
    });
  }, []);

  const handleAnswer = (ans) => {
    state?.resolve(ans);
    setState(null);
  };

  const COLORS = {
    danger:  { bg: 'var(--danger)',  label: 'Xác nhận' },
    warning: { bg: 'var(--gold)',    label: 'Xác nhận' },
    primary: { bg: 'var(--accent)',  label: 'Xác nhận' },
  };
  const col = COLORS[state?.variant] || COLORS.danger;

  const ConfirmModal = () => !state ? null : (
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,.7)',
      display:'flex',alignItems:'center',justifyContent:'center',
      zIndex:9999,padding:20
    }} onClick={() => handleAnswer(false)}>
      <div style={{
        background:'var(--bg-card)',border:'1px solid var(--border)',
        borderRadius:14,padding:'28px 28px 20px',maxWidth:380,width:'100%',
        boxShadow:'0 20px 60px rgba(0,0,0,.5)'
      }} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <AlertTriangle size={22} style={{color:col.bg,flexShrink:0}}/>
          <p style={{margin:0,fontSize:15,color:'var(--text-primary)',lineHeight:1.5}}>{state.msg}</p>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => handleAnswer(false)}>Huỷ</button>
          <button className="btn btn-sm" onClick={() => handleAnswer(true)}
            style={{background:col.bg,color:'#fff',border:'none'}}>
            {col.label}
          </button>
        </div>
      </div>
    </div>
  );

  return { confirm, ConfirmModal };
};
