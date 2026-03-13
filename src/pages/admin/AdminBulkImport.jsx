// src/pages/admin/AdminBulkImport.jsx
import { useConfirm } from '../../components/shared/ConfirmModal';
import React, { useState, useRef } from 'react';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Upload, Download, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const TS = { style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' }};

const TEMPLATE_CSV = `title,price,gameType,rank,server,loginUsername,loginPassword,loginEmail,loginNote
"LMHT - Rank Vàng 3 - 80 tướng",150000,LMHT,Vàng 3,VN,username1,password1,email@gmail.com,Ghi chú tùy chọn
"Liên Quân - Kim Cương - Full tướng",200000,Liên Quân,Kim Cương,Việt Nam,username2,password2,,
"Valorant - Immortal",350000,Valorant,Immortal,Asia,username3,password3,,`;

const parseCSV = (text) => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('File phải có ít nhất 1 dòng dữ liệu + header');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,'').toLowerCase());
  return lines.slice(1).map((line, i) => {
    // Simple CSV parser (handles quoted fields)
    const values = [];
    let cur = ''; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    values.push(cur.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx]||''; });
    row._line = i + 2;
    return row;
  });
};

const validateRow = (row) => {
  const errors = [];
  if (!row.title?.trim())     errors.push('thiếu title');
  if (!row.price || isNaN(Number(row.price)) || Number(row.price) <= 0) errors.push('price không hợp lệ');
  if (!row.gametype?.trim() && !row.gameType?.trim()) errors.push('thiếu gameType');
  if (!row.loginusername?.trim() && !row.loginUsername?.trim()) errors.push('thiếu loginUsername');
  return errors;
};

const AdminBulkImport = () => {
  const { confirm, ConfirmModal } = useConfirm();
  const [rows, setRows]         = useState([]);
  const [errors, setErrors]     = useState({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone]         = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        const errs = {};
        parsed.forEach((r, i) => {
          const e = validateRow(r);
          if (e.length) errs[i] = e;
        });
        setRows(parsed);
        setErrors(errs);
        setDone(null);
        if (Object.keys(errs).length)
          toast.error(`${Object.keys(errs).length} dòng có lỗi, vui lòng kiểm tra`, TS);
        else
          toast.success(`Đọc được ${parsed.length} account, sẵn sàng import`, TS);
      } catch(err) { toast.error('Lỗi đọc file: '+err.message, TS); }
    };
    reader.readAsText(f, 'utf-8');
    e.target.value = '';
  };

  const handleImport = async () => {
    const validRows = rows.filter((_,i) => !errors[i]);
    if (!validRows.length) { toast.error('Không có dòng hợp lệ để import', TS); return; }
    if (!(await confirm(`Import ${validRows.length} account vào hệ thống?`, 'primary'))) return;
    setImporting(true); setProgress(0); setDone(null);
    let success = 0; let fail = 0;
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      try {
        const gt = (r.gametype || r.gameType || '').trim();
        const uname = (r.loginusername || r.loginUsername || '').trim();
        const upass = (r.loginpassword || r.loginPassword || '').trim();
        const uemail = (r.loginemail || r.loginEmail || '').trim();
        const note = (r.loginnote || r.loginNote || '').trim();
        const cred = { loginUsername:uname, loginPassword:upass, loginEmail:uemail, loginNote:note,
          attachmentContent:null, attachmentName:null };

        // FIX: tách credentials ra subcollection /accounts/{id}/credentials/slots
        // KHÔNG đặt credentials trong main doc (main doc có allow read: if true → public!)
        const publicPayload = {
          title:         r.title.trim(),
          price:         Number(r.price),
          originalPrice: r.originalprice || r.originalPrice ? Number(r.originalprice||r.originalPrice) : null,
          gameType:      gt,
          rank:          (r.rank||'').trim()||null,
          server:        (r.server||'').trim()||null,
          status:        'available',
          quantity:      1,
          soldCount:     0,
          views:         0,
          images:        [],
          createdAt:     serverTimestamp(),
          updatedAt:     serverTimestamp(),
        };
        // KHÔNG có: credentials, loginUsername, loginPassword, loginEmail, loginNote
        const accountRef = await addDoc(collection(db,'accounts'), publicPayload);
        // Credentials vào subcollection — rule: allow read/write: if isAdmin()
        await setDoc(doc(db,'accounts', accountRef.id, 'credentials', 'slots'), {
          slots: [cred],
          updatedAt: serverTimestamp(),
        });
        success++;
      } catch(e) { fail++; console.error('Row import error:', e); }
      setProgress(Math.round((i+1)/validRows.length*100));
    }
    setImporting(false);
    setDone({ success, fail });
    toast.success(`✅ Import xong: ${success} thành công, ${fail} lỗi`, TS);
    if (success > 0) { setRows([]); setErrors({}); }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='template_import_accounts.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const validCount  = rows.length - Object.keys(errors).length;
  const errorCount  = Object.keys(errors).length;

  return (
    <div><ConfirmModal/>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title"><Upload size={20} style={{color:'var(--accent)'}}/> Bulk Import</h1>
          <p className="admin-page-sub">Import nhiều account cùng lúc từ file CSV</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}><Download size={14}/> Tải template CSV</button>
      </div>

      {/* Upload zone */}
      <div className="card" style={{padding:32,textAlign:'center',border:'2px dashed var(--border)',cursor:'pointer',marginBottom:20,transition:'border-color .2s'}}
        onClick={()=>fileRef.current?.click()}
        onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='var(--accent)'}}
        onDragLeave={e=>{e.currentTarget.style.borderColor='var(--border)'}}
        onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor='var(--border)';const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);fileRef.current.files=dt.files;handleFile({target:{files:dt.files,value:''}});}}}>
        <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleFile}/>
        <FileText size={40} style={{color:'var(--accent)',marginBottom:12,opacity:.7}}/>
        <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>Kéo thả file CSV vào đây hoặc click để chọn</div>
        <div style={{fontSize:12,color:'var(--text-muted)'}}>Chỉ hỗ trợ .csv · UTF-8 · Tối đa 500 dòng</div>
      </div>

      {/* Progress */}
      {importing && (
        <div className="card" style={{padding:20,marginBottom:20}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13,fontWeight:600}}>
            <span>Đang import...</span><span>{progress}%</span>
          </div>
          <div style={{height:8,background:'var(--bg-primary)',borderRadius:4,overflow:'hidden'}}>
            <div style={{height:'100%',background:'linear-gradient(90deg,var(--accent),var(--accent2))',width:`${progress}%`,transition:'width .3s',borderRadius:4}}/>
          </div>
        </div>
      )}

      {done && (
        <div className="card" style={{padding:20,marginBottom:20,border:`1px solid ${done.fail?'var(--danger)':'var(--success)'}`}}>
          <CheckCircle size={18} style={{color:'var(--success)',marginRight:8}}/>
          <strong>{done.success}</strong> account import thành công · <strong style={{color:'var(--danger)'}}>{done.fail}</strong> lỗi
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div style={{fontSize:14,fontWeight:600}}>
              Preview: <span style={{color:'var(--success)'}}>{validCount} hợp lệ</span>
              {errorCount > 0 && <span style={{color:'var(--danger)',marginLeft:12}}>{errorCount} lỗi</span>}
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleImport} disabled={importing||validCount===0}>
              <Upload size={14}/> Import {validCount} account
            </button>
          </div>
          <div className="table-wrap" style={{maxHeight:400,overflowY:'auto'}}>
            <table className="admin-table">
              <thead><tr><th>#</th><th>Title</th><th>Giá</th><th>Game</th><th>Username</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} style={{background:errors[i]?'rgba(255,71,87,0.05)':''}}>
                    <td style={{fontSize:11,color:'var(--text-muted)'}}>{r._line}</td>
                    <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{r.title}</td>
                    <td style={{fontSize:13}}>{Number(r.price).toLocaleString('vi-VN')}đ</td>
                    <td style={{fontSize:12}}>{r.gametype||r.gameType}</td>
                    <td style={{fontFamily:'monospace',fontSize:12}}>{r.loginusername||r.loginUsername}</td>
                    <td>
                      {errors[i]
                        ? <span style={{color:'var(--danger)',fontSize:11}}><AlertTriangle size={11}/> {errors[i].join(', ')}</span>
                        : <span style={{color:'var(--success)',fontSize:11}}>✓ OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card" style={{padding:20,marginTop:20}}>
        <h3 style={{fontFamily:'Rajdhani',fontSize:15,fontWeight:700,marginBottom:12}}>📋 Hướng dẫn</h3>
        <div style={{fontSize:13,color:'var(--text-secondary)',lineHeight:2}}>
          <div>• Tải template CSV mẫu, điền thông tin vào từng dòng</div>
          <div>• Các cột bắt buộc: <code>title</code>, <code>price</code>, <code>gameType</code>, <code>loginUsername</code></div>
          <div>• Các cột tùy chọn: <code>rank</code>, <code>server</code>, <code>loginPassword</code>, <code>loginEmail</code>, <code>loginNote</code></div>
          <div>• Mỗi dòng = 1 account với 1 slot credential</div>
          <div>• File phải được lưu dạng UTF-8 để hỗ trợ tiếng Việt</div>
          <div>• Sau import, vào Admin Accounts để thêm ảnh và thông tin bổ sung</div>
        </div>
      </div>
    </div>
  );
};

export default AdminBulkImport;
