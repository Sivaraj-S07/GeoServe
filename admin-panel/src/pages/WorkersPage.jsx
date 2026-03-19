import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api";

const ONLINE_MS = 5 * 60 * 1000;
function isOnline(w) {
  if (!w.availability) return false;
  if (w.lastSeenAt) return Date.now()-new Date(w.lastSeenAt).getTime()<ONLINE_MS;
  return w.availability===true;
}
function timeAgo(iso) {
  if (!iso) return "Never";
  const d = Math.floor((Date.now()-new Date(iso))/1000);
  if (d<10) return "Just now"; if (d<60) return `${d}s ago`;
  if (d<3600) return `${Math.floor(d/60)}m ago`; if (d<86400) return `${Math.floor(d/3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}

function WorkerCard({ worker, category, onApprove, onDelete, approving, deleting }) {
  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name)}&background=4f46e5&color=fff&size=80`;
  const online = isOnline(worker);
  return (
    <div style={{ background:"white",border:`1.5px solid ${worker.approved?"#e2e8f0":"#fde68a"}`,borderRadius:18,overflow:"hidden",transition:"all .2s ease",display:"flex",flexDirection:"column" }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=worker.approved?"0 10px 32px rgba(0,0,0,.09)":"0 10px 32px rgba(217,119,6,.15)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
    >
      {/* Top gradient bar */}
      <div style={{ height:4,background:worker.approved?"linear-gradient(90deg,#2563eb,#7c3aed)":"linear-gradient(90deg,#f59e0b,#d97706)" }} />

      {/* Status chip */}
      {!worker.approved && (
        <div style={{ background:"linear-gradient(135deg,#fffbeb,#fef3c7)",padding:"6px 14px",display:"flex",alignItems:"center",gap:6,borderBottom:"1px solid #fde68a" }}>
          <span style={{ fontSize:12 }}>⏳</span>
          <span style={{ fontSize:11,fontWeight:800,color:"#92400e" }}>Awaiting Approval</span>
        </div>
      )}

      <div style={{ padding:"18px 20px",flex:1 }}>
        {/* Avatar + name */}
        <div style={{ display:"flex",alignItems:"flex-start",gap:14,marginBottom:14 }}>
          <div style={{ position:"relative",flexShrink:0 }}>
            <img src={worker.avatar||fb} onError={e=>{e.target.src=fb;}}
              style={{ width:56,height:56,borderRadius:14,objectFit:"cover",border:"2px solid #e2e8f0",boxShadow:"0 3px 10px rgba(0,0,0,.1)" }} />
            <div style={{ position:"absolute",bottom:2,right:2,width:13,height:13,borderRadius:"50%",background:online?"#22c55e":"#d1d5db",border:"2.5px solid white",boxShadow:online?"0 0 0 2px rgba(34,197,94,.25)":"none" }} />
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontWeight:800,fontSize:15,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{worker.name}</div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {category && <span style={{ background:"#eff6ff",border:"1px solid #bfdbfe",color:"#1d4ed8",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20 }}>{category}</span>}
              <span style={{ background:online?"#ecfdf5":"#f8fafc",border:`1px solid ${online?"#a7f3d0":"#e2e8f0"}`,color:online?"#059669":"#94a3b8",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20 }}>
                {online?"● Online":"● Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:14 }}>
          {[
            { icon:"📧", val:worker.email },
            { icon:"📞", val:worker.phone },
            worker.pincode && { icon:"📍", val:`Pincode: ${worker.pincode}${worker.street?` · ${worker.street}`:""}` },
            worker.specialization && { icon:"🔧", val:worker.specialization },
          ].filter(Boolean).filter(x=>x.val).map(x=>(
            <div key={x.icon} style={{ display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#475569" }}>
              <span style={{ fontSize:13,width:18,textAlign:"center",flexShrink:0 }}>{x.icon}</span>
              <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{x.val}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display:"flex",gap:10,marginBottom:14 }}>
          {worker.rating>0 && (
            <div style={{ flex:1,textAlign:"center",padding:"8px",background:"#fffbeb",borderRadius:10,border:"1px solid #fde68a" }}>
              <div style={{ fontSize:16,fontWeight:900,color:"#d97706" }}>⭐ {worker.rating}</div>
              <div style={{ fontSize:10,fontWeight:700,color:"#92400e",textTransform:"uppercase" }}>Rating</div>
            </div>
          )}
          {worker.jobsCompleted>0 && (
            <div style={{ flex:1,textAlign:"center",padding:"8px",background:"#ecfdf5",borderRadius:10,border:"1px solid #a7f3d0" }}>
              <div style={{ fontSize:16,fontWeight:900,color:"#059669" }}>{worker.jobsCompleted}</div>
              <div style={{ fontSize:10,fontWeight:700,color:"#065f46",textTransform:"uppercase" }}>Jobs</div>
            </div>
          )}
          {worker.yearsOfExp>0 && (
            <div style={{ flex:1,textAlign:"center",padding:"8px",background:"#eff6ff",borderRadius:10,border:"1px solid #bfdbfe" }}>
              <div style={{ fontSize:16,fontWeight:900,color:"#2563eb" }}>{worker.yearsOfExp}y</div>
              <div style={{ fontSize:10,fontWeight:700,color:"#1d4ed8",textTransform:"uppercase" }}>Exp</div>
            </div>
          )}
        </div>

        <div style={{ fontSize:11,color:"#94a3b8",marginBottom:14 }}>Last seen: {timeAgo(worker.lastSeenAt)}</div>
      </div>

      {/* Action buttons */}
      <div style={{ padding:"12px 20px",borderTop:`1px solid ${worker.approved?"#f3f4f6":"#fde68a"}`,background:worker.approved?"#fafafa":"#fffbeb",display:"flex",gap:8 }}>
        {!worker.approved ? (
          <button disabled={approving} onClick={()=>onApprove(worker.id)}
            style={{ flex:1,padding:"9px",borderRadius:10,border:"none",background:approving?"#d1fae5":"linear-gradient(135deg,#059669,#10b981)",color:"white",fontWeight:800,fontSize:13,cursor:approving?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:approving?"none":"0 4px 14px rgba(5,150,105,.35)",transition:"all .15s" }}
            onMouseEnter={e=>{if(!approving)e.currentTarget.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="";}}
          >
            {approving?"✓ Approving…":"✅ Approve Worker"}
          </button>
        ) : (
          <div style={{ flex:1,display:"flex",alignItems:"center",gap:7,padding:"8px 12px",background:"#ecfdf5",borderRadius:10,border:"1px solid #a7f3d0" }}>
            <span style={{ fontSize:14 }}>✅</span>
            <span style={{ fontSize:12,fontWeight:700,color:"#059669" }}>Approved</span>
          </div>
        )}
        <button disabled={deleting} onClick={()=>{ if(window.confirm(`Remove ${worker.name}?`)) onApprove(worker.id,"delete"); }}
          style={{ padding:"9px 12px",borderRadius:10,border:"1.5px solid #fecaca",background:"#fef2f2",color:"#dc2626",fontSize:13,cursor:deleting?"not-allowed":"pointer",fontFamily:"inherit",transition:"all .15s",fontWeight:700 }}
          title="Delete worker"
          onClick={()=>{ if(window.confirm(`Delete ${worker.name}? This cannot be undone.`)) onApprove(worker.id,"delete"); }}
        >🗑</button>
      </div>
    </div>
  );
}

export default function WorkersPage({ onToast }) {
  const [workers,  setWorkers]  = useState([]);
  const [cats,     setCats]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [catF,     setCatF]     = useState("");
  const [statusF,  setStatusF]  = useState("all");
  const [onlineF,  setOnlineF]  = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [busy,     setBusy]     = useState({});
  const [lastRefresh, setLR]    = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    try {
      const [w,c] = await Promise.all([api.getAllWorkers(),api.getCategories()]);
      // ✅ STRICTLY filter: only role === "worker" — regular users never appear here
      const workersOnly = (Array.isArray(w) ? w : []).filter(u => !u.role || u.role === "worker");
      setWorkers(workersOnly); setCats(c); setLR(new Date());
    } catch { if (!silent) onToast("Failed to load workers","error"); }
    finally { if (!silent) setLoading(false); }
  },[onToast]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(()=>load(true),30_000);
    return ()=>clearInterval(pollRef.current);
  },[load]);

  const handleApprove = async (id) => {
    setBusy(p=>({...p,[id]:true}));
    try { const updated=await api.approveWorker(id); setWorkers(p=>p.map(w=>w.id===id?updated:w)); onToast("Worker approved ✅"); }
    catch { onToast("Failed to approve","error"); }
    finally { setBusy(p=>({...p,[id]:false})); }
  };
  const handleDelete = async (id) => {
    setBusy(p=>({...p,[`del_${id}`]:true}));
    try { await api.deleteWorker(id); setWorkers(p=>p.filter(w=>w.id!==id)); onToast("Worker deleted"); }
    catch { onToast("Failed to delete","error"); }
    finally { setBusy(p=>({...p,[`del_${id}`]:false})); }
  };

  const filtered = workers.filter(w=>{
    const q=search.toLowerCase();
    const mQ=!q||w.name?.toLowerCase().includes(q)||w.email?.toLowerCase().includes(q)||w.specialization?.toLowerCase().includes(q);
    const mC=!catF||String(w.categoryId)===catF;
    const mS=statusF==="all"||(statusF==="approved"&&w.approved)||(statusF==="pending"&&!w.approved);
    const mO=onlineF==="all"||(onlineF==="online"&&isOnline(w))||(onlineF==="offline"&&!isOnline(w));
    return mQ&&mC&&mS&&mO;
  });

  const pendingCount = workers.filter(w=>!w.approved).length;
  const onlineCount  = workers.filter(w=>isOnline(w)).length;
  const getCat = id => cats.find(c=>c.id===id);

  return (
    <div className="anim-fade">
      {/* Header */}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:26,fontWeight:900,letterSpacing:"-.5px",margin:0 }}>🔧 Worker Management</h1>
          <p style={{ color:"#64748b",fontSize:14,marginTop:5,marginBottom:0 }}>{workers.length} total · {onlineCount} online · {pendingCount} pending approval</p>
          <div style={{ marginTop:8,display:"inline-flex",alignItems:"center",gap:6,background:"#fef3c7",border:"1px solid #fde68a",borderRadius:20,padding:"3px 12px",fontSize:11,fontWeight:700,color:"#92400e" }}>✅ Workers only — regular users excluded</div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <button onClick={()=>setViewMode(v=>v==="grid"?"table":"grid")}
            style={{ padding:"8px 16px",borderRadius:10,border:"1.5px solid #e2e8f0",background:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
            {viewMode==="grid"?"📋 Table":"🃏 Grid"}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={()=>load()}>↻ Refresh</button>
        </div>
      </div>

      {/* Pending alert */}
      {pendingCount>0 && (
        <div style={{ background:"linear-gradient(135deg,#fffbeb,#fef3c7)",border:"1.5px solid #fde68a",borderRadius:14,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:14,boxShadow:"0 4px 16px rgba(217,119,6,.1)" }}>
          <span style={{ fontSize:24 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800,color:"#92400e",fontSize:14 }}>{pendingCount} worker{pendingCount>1?"s":""} awaiting approval</div>
            <div style={{ fontSize:12,color:"#78350f",marginTop:2 }}>Review and approve new worker registrations below.</div>
          </div>
          <button onClick={()=>setStatusF("pending")} style={{ padding:"8px 16px",background:"#d97706",color:"white",border:"none",borderRadius:9,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",flexShrink:0 }}>
            View Pending →
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:20 }}>
        {[
          { label:"Total",    val:workers.length,   grad:"linear-gradient(135deg,#4f46e5,#7c3aed)",bg:"#eef2ff",border:"#c7d2fe" },
          { label:"Approved", val:workers.filter(w=>w.approved).length, grad:"linear-gradient(135deg,#059669,#10b981)",bg:"#ecfdf5",border:"#a7f3d0" },
          { label:"Pending",  val:pendingCount,     grad:"linear-gradient(135deg,#d97706,#f59e0b)",bg:"#fffbeb",border:"#fde68a" },
          { label:"Online",   val:onlineCount,      grad:"linear-gradient(135deg,#059669,#34d399)",bg:"#ecfdf5",border:"#a7f3d0" },
        ].map(s=>(
          <div key={s.label} style={{ background:"white",borderRadius:14,border:`1.5px solid ${s.border}`,padding:"14px 16px",position:"relative",overflow:"hidden",cursor:"default" }}>
            <div style={{ height:3,background:s.grad,position:"absolute",top:0,left:0,right:0,borderRadius:"14px 14px 0 0" }} />
            <div style={{ paddingTop:4 }}>
              <div style={{ fontSize:24,fontWeight:900,letterSpacing:-1,color:"#0f172a" }}>{s.val}</div>
              <div style={{ fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:".04em",marginTop:3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:"white",border:"1.5px solid #e2e8f0",borderRadius:14,padding:"12px 16px",marginBottom:20,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",boxShadow:"0 2px 8px rgba(0,0,0,.04)" }}>
        <div style={{ position:"relative",flex:1,minWidth:200 }}>
          <span style={{ position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",fontSize:13,opacity:.4 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search workers…"
            style={{ paddingLeft:32,background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:9,height:36,fontSize:13 }} />
        </div>
        {[
          { val:statusF, set:setStatusF, opts:[["all","All Workers"],["approved","Approved"],["pending","Pending"]] },
          { val:onlineF, set:setOnlineF, opts:[["all","All Status"],["online","Online"],["offline","Offline"]] },
        ].map((f,i)=>(
          <select key={i} value={f.val} onChange={e=>f.set(e.target.value)}
            style={{ width:"auto",minWidth:140,height:36,borderRadius:9,border:"1.5px solid #e2e8f0",background:"#f8fafc",fontSize:13,padding:"0 10px" }}>
            {f.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        {cats.length>0 && (
          <select value={catF} onChange={e=>setCatF(e.target.value)}
            style={{ width:"auto",minWidth:150,height:36,borderRadius:9,border:"1.5px solid #e2e8f0",background:"#f8fafc",fontSize:13,padding:"0 10px" }}>
            <option value="">All Categories</option>
            {cats.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        )}
        <div style={{ marginLeft:"auto",fontSize:12,color:"#94a3b8",fontWeight:600 }}>{filtered.length} workers</div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:64,gap:14 }}>
          <div style={{ width:32,height:32,borderRadius:"50%",border:"3px solid #eef2ff",borderTopColor:"#4f46e5",animation:"spin .7s linear infinite" }} />
          <span style={{ color:"#64748b",fontWeight:600 }}>Loading workers…</span>
        </div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:"center",padding:"64px 24px",background:"white",borderRadius:18,border:"1.5px solid #e2e8f0" }}>
          <div style={{ fontSize:48,marginBottom:12,opacity:.6 }}>🔧</div>
          <div style={{ fontWeight:700,fontSize:16,color:"#0f172a",marginBottom:6 }}>No workers found</div>
          <div style={{ fontSize:13,color:"#94a3b8" }}>Try adjusting your filters</div>
        </div>
      ) : viewMode==="grid" ? (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:18 }}>
          {filtered.map(w=>(
            <WorkerCard key={w.id} worker={w} category={getCat(w.categoryId)?.name}
              approving={busy[w.id]} deleting={busy[`del_${w.id}`]}
              onApprove={(id,action)=>{ if(action==="delete")handleDelete(id); else handleApprove(id); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div style={{ background:"white",border:"1.5px solid #e2e8f0",borderRadius:18,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,.05)" }}>
          <table className="data-table">
            <thead><tr><th>Worker</th><th>Category</th><th>Contact</th><th>Rating</th><th>Status</th><th>Last Seen</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(w=>{
                const online=isOnline(w);
                const fb=`https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=4f46e5&color=fff&size=80`;
                return (
                  <tr key={w.id} onMouseEnter={e=>{[...e.currentTarget.querySelectorAll("td")].forEach(td=>td.style.background="#f8faff");}} onMouseLeave={e=>{[...e.currentTarget.querySelectorAll("td")].forEach(td=>td.style.background="");}}>
                    <td>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div style={{ position:"relative",flexShrink:0 }}>
                          <img src={w.avatar||fb} onError={e=>{e.target.src=fb;}} style={{ width:36,height:36,borderRadius:10,objectFit:"cover",border:"2px solid #e2e8f0" }} />
                          <div style={{ position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:"50%",background:online?"#22c55e":"#d1d5db",border:"2px solid white" }} />
                        </div>
                        <div>
                          <div style={{ fontWeight:700,fontSize:13 }}>{w.name}</div>
                          <div style={{ fontSize:11,color:"#94a3b8" }}>{w.specialization||"—"}</div>
                        </div>
                      </div>
                    </td>
                    <td>{getCat(w.categoryId)?.name && <span className="badge badge-blue" style={{ fontSize:11 }}>{getCat(w.categoryId).name}</span>}</td>
                    <td>
                      <div style={{ fontSize:12,color:"#64748b" }}>{w.email}</div>
                      <div style={{ fontSize:11,color:"#94a3b8" }}>{w.phone}</div>
                    </td>
                    <td>{w.rating>0?<span style={{ fontWeight:800,color:"#d97706" }}>⭐ {w.rating}</span>:<span style={{ color:"#94a3b8",fontSize:12 }}>No rating</span>}</td>
                    <td>
                      <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                        <span className={`badge ${w.approved?"badge-green":"badge-amber"}`}>{w.approved?"✅ Approved":"⏳ Pending"}</span>
                        <span className={`badge ${online?"badge-green":"badge-gray"}`} style={{ fontSize:10 }}>{online?"● Online":"● Offline"}</span>
                      </div>
                    </td>
                    <td style={{ fontSize:12,color:"#64748b" }}>{timeAgo(w.lastSeenAt)}</td>
                    <td>
                      <div style={{ display:"flex",gap:6 }}>
                        {!w.approved && <button disabled={busy[w.id]} onClick={()=>handleApprove(w.id)} className="btn btn-green btn-sm" style={{ fontSize:12 }}>{busy[w.id]?"…":"✅"}</button>}
                        <button disabled={busy[`del_${w.id}`]} onClick={()=>{ if(window.confirm(`Delete ${w.name}?`))handleDelete(w.id); }} className="btn btn-red btn-sm" style={{ fontSize:12 }}>{busy[`del_${w.id}`]?"…":"🗑"}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
