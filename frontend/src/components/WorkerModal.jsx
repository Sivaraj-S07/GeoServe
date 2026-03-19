import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";
import PincodeSelector from "./PincodeSelector";

const BLANK = {
  name: "", categoryId: "", specialization: "", bio: "",
  experience: "", yearsOfExp: "", skills: [],
  phone: "", email: "",
  lat: "13.0827", lng: "80.2707",
  avatar: "", availability: true,
  pincode: "", street: "",
};

const SKILL_OPTIONS = [
  "Electrical Wiring","Circuit Repair","AC Service","Refrigerator Repair",
  "Plumbing","Pipe Fitting","Bathroom Fitting","Carpentry","Furniture Assembly",
  "Painting","Wall Plastering","Waterproofing","CCTV Installation",
  "Wi-Fi Setup","Home Theatre","Cleaning","Deep Clean","Pest Control",
  "Shifting & Packing","Welding","Fabrication","Masonry",
];

export default function WorkerModal({ worker, categories, onSave, onClose }) {
  const isEdit = Boolean(worker?.id);
  const [f, setF]       = useState(BLANK);
  const [errs, setE]    = useState({});
  const [busy, setBusy] = useState(false);
  const [photoTab, setPhotoTab]       = useState("url");
  const [skillInput, setSkillInput]   = useState("");
  const [showDrop, setShowDrop]       = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (worker) {
      setF({
        name:           worker.name || "",
        categoryId:     String(worker.categoryId || categories[0]?.id || ""),
        specialization: worker.specialization || "",
        bio:            worker.bio || "",
        experience:     worker.experience || "",
        yearsOfExp:     String(worker.yearsOfExp || ""),
        skills:         Array.isArray(worker.skills) ? worker.skills : [],
        phone:          worker.phone || "",
        email:          worker.email || "",
        lat:            String(worker.lat || "13.0827"),
        lng:            String(worker.lng || "80.2707"),
        avatar:         worker.avatar || "",
        availability:   worker.availability ?? true,
        pincode:        worker.pincode || "",
        street:         worker.street || "",
      });
    } else {
      setF({ ...BLANK, categoryId: String(categories[0]?.id || "") });
    }
    setE({});
  }, [worker]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggleSkill = (s) => setF(p => ({
    ...p, skills: p.skills.includes(s) ? p.skills.filter(x => x !== s) : [...p.skills, s],
  }));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
    const reader = new FileReader();
    reader.onload = ev => set("avatar", ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!f.name.trim())           e.name = "Required";
    if (!f.categoryId)            e.categoryId = "Required";
    if (!f.specialization.trim()) e.specialization = "Required";
    if (!f.phone.trim())          e.phone = "Required";
    else if (f.phone.replace(/\D/g,"").length !== 10) e.phone = "Must be exactly 10 digits";
    if (!f.avatar.trim())         e.avatar = "Work photo is mandatory — please upload a photo showing you performing your work";
    setE(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await onSave({ ...f, categoryId: parseInt(f.categoryId), lat: parseFloat(f.lat)||13.0827, lng: parseFloat(f.lng)||80.2707, yearsOfExp: parseInt(f.yearsOfExp)||0 });
    } finally { setBusy(false); }
  };

  const fb = `https://ui-avatars.com/api/?name=${encodeURIComponent(f.name||"W")}&background=16a34a&color=fff&size=80`;
  const inp = (err) => ({ width:"100%", padding:"10px 12px", border:`1.5px solid ${err?"#ef4444":"#e2e8f0"}`, borderRadius:9, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box", background: err ? "#fef2f2" : "white" });
  const filteredSkills = SKILL_OPTIONS.filter(s => s.toLowerCase().includes(skillInput.toLowerCase()) && !f.skills.includes(s));

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(15,23,42,.65)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, overflowY:"auto" }} onClick={onClose}>
      <div style={{ background:"var(--surface)", borderRadius:20, width:"100%", maxWidth:600, boxShadow:"0 24px 80px rgba(0,0,0,.25)", overflow:"hidden", maxHeight:"90vh", display:"flex", flexDirection:"column" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", border:"1.5px solid rgba(255,255,255,.3)" }}>
              <Icon name="user" size={18} color="white" />
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:"white", fontFamily:"'DM Sans',sans-serif" }}>{isEdit ? "Edit Profile" : "Create Worker Profile"}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,.75)", marginTop:1 }}>{isEdit ? `Editing ${worker.name}` : "Fill in your professional details"}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:9, background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="x" size={16} color="white" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY:"auto", flex:1, padding:"24px" }}>

          {/* PHOTO */}
          <SecLabel icon="📸" label="Work Photo (Mandatory — must show you performing your work)" />
          <div style={{ marginBottom:20 }}>
            <div style={{ background:"#fffbeb", border:"1.5px solid #fbbf24", borderRadius:10, padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#92400e", fontWeight:600 }}>
              ⚠️ You must upload a photo of yourself performing your work. Profile cannot be saved without it.
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:12 }}>
              <div style={{ position:"relative" }}>
                <img src={f.avatar||fb} onError={e=>{e.target.src=fb}} style={{ width:72, height:72, borderRadius:16, objectFit:"cover", border:`2.5px solid ${errs.avatar?"#ef4444":"#2563eb"}`, boxShadow:"0 4px 16px rgba(0,0,0,.12)" }} />
                {f.avatar && <div style={{ position:"absolute", bottom:-4, right:-4, width:22, height:22, borderRadius:"50%", background:"#22c55e", border:"2px solid white", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="check" size={10} color="white" /></div>}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:"var(--text)", marginBottom:2 }}>{f.name||"Worker Name"}</div>
                <div style={{ fontSize:12, color:"var(--muted)" }}>{categories.find(c=>c.id===parseInt(f.categoryId))?.name||"Category"}{f.specialization?` · ${f.specialization}`:""}</div>
                {errs.avatar && <div style={{ fontSize:11, color:"#ef4444", marginTop:3 }}>⚠ {errs.avatar}</div>}
              </div>
            </div>
            <div style={{ display:"flex", gap:4, background:"var(--bg-alt)", borderRadius:9, padding:3, marginBottom:10 }}>
              {[["url","📎 Image URL"],["upload","📤 Upload Photo"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>setPhotoTab(id)} style={{ flex:1, padding:"6px 0", borderRadius:7, background:photoTab===id?"white":"transparent", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, color:photoTab===id?"#2563eb":"#64748b", fontFamily:"inherit", boxShadow:photoTab===id?"0 1px 4px rgba(0,0,0,.08)":"none" }}>{lbl}</button>
              ))}
            </div>
            {photoTab==="url" ? (
              <input style={inp(errs.avatar)} value={f.avatar} onChange={e=>set("avatar",e.target.value)} placeholder="https://example.com/your-photo.jpg" />
            ) : (
              <>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile} />
                <button onClick={()=>fileRef.current?.click()} style={{ width:"100%", padding:"12px", border:`2px dashed ${errs.avatar?"#ef4444":"#bfdbfe"}`, borderRadius:10, background:"var(--bg)", color:"#2563eb", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <Icon name="upload" size={16} color="#2563eb" />
                  {f.avatar&&f.avatar.startsWith("data:") ? "✓ Photo uploaded — click to change" : "Click to upload (JPG, PNG — max 5MB)"}
                </button>
              </>
            )}
          </div>

          {/* BASIC INFO */}
          <SecLabel icon="👤" label="Basic Information" />
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
            <FL label="Full Name" req err={errs.name}>
              <input style={inp(errs.name)} value={f.name} onChange={e=>set("name",e.target.value)} placeholder="Your full name" />
            </FL>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FL label="Category" req err={errs.categoryId}>
                <select style={inp(errs.categoryId)} value={f.categoryId} onChange={e=>set("categoryId",e.target.value)}>
                  <option value="">Select…</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </FL>
              <FL label="Specialization" req err={errs.specialization}>
                <input style={inp(errs.specialization)} value={f.specialization} onChange={e=>set("specialization",e.target.value)} placeholder="e.g. Electrical Wiring" />
              </FL>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FL label="Phone" req err={errs.phone}>
                <input
                  style={inp(errs.phone)}
                  type="tel"
                  value={f.phone}
                  onChange={e=>{
                    const digits = e.target.value.replace(/\D/g,"").slice(0,10);
                    set("phone", digits);
                  }}
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                />
              </FL>
              <FL label="Email">
                <input type="email" style={inp(false)} value={f.email} onChange={e=>set("email",e.target.value)} placeholder="you@gmail.com" />
              </FL>
            </div>
          </div>

          {/* EXPERIENCE */}
          <SecLabel icon="🏆" label="Work Experience" />
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
            <FL label="Years of Experience">
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[0,1,2,3,4,5,6,7,8,10,12,15].map(yr=>(
                  <button key={yr} onClick={()=>set("yearsOfExp",String(yr))} style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${f.yearsOfExp===String(yr)?"#2563eb":"#e2e8f0"}`, background:f.yearsOfExp===String(yr)?"#eff6ff":"white", color:f.yearsOfExp===String(yr)?"#2563eb":"#64748b", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    {yr===0?"Fresher":`${yr}+ yrs`}
                  </button>
                ))}
              </div>
            </FL>

            <FL label="Experience Description">
              <textarea style={{ ...inp(false), resize:"vertical", lineHeight:1.6 }} value={f.experience} onChange={e=>set("experience",e.target.value)} rows={3}
                placeholder={`Describe your work experience.\nExample: "I have 5 years of electrical repair experience. I have worked on home wiring and commercial lighting."`}
              />
              <span style={{ fontSize:11, color:"var(--muted)", marginTop:4, display:"block" }}>This helps users choose an experienced worker. Be specific!</span>
            </FL>

            <FL label="Profile Bio / Summary">
              <textarea style={{ ...inp(false), resize:"vertical", lineHeight:1.6 }} value={f.bio} onChange={e=>set("bio",e.target.value)} rows={2} placeholder="Brief professional summary…" />
            </FL>

            <FL label="Skills & Services">
              <div style={{ position:"relative" }}>
                <input style={inp(false)} value={skillInput} onChange={e=>{setSkillInput(e.target.value);setShowDrop(true)}} onFocus={()=>setShowDrop(true)} onBlur={()=>setTimeout(()=>setShowDrop(false),150)} placeholder="Search and add skills…" />
                {showDrop && filteredSkills.length>0 && (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:100, background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:9, marginTop:4, maxHeight:160, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,.12)" }}>
                    {filteredSkills.map(s=>(
                      <div key={s} onMouseDown={()=>{toggleSkill(s);setSkillInput("")}} style={{ padding:"8px 12px", cursor:"pointer", fontSize:13, color:"var(--text-secondary)", fontWeight:500 }} onMouseEnter={e=>e.currentTarget.style.background="#f0f9ff"} onMouseLeave={e=>e.currentTarget.style.background="white"}>+ {s}</div>
                    ))}
                  </div>
                )}
              </div>
              {f.skills.length>0 && (
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                  {f.skills.map(s=>(
                    <span key={s} style={{ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
                      {s}<span onClick={()=>toggleSkill(s)} style={{ cursor:"pointer", opacity:.6, fontSize:13 }}>×</span>
                    </span>
                  ))}
                </div>
              )}
            </FL>
          </div>

          {/* LOCATION */}
          <SecLabel icon="📍" label="Location" />
          <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:20 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <FL label="Latitude"><input type="number" step="any" style={inp(false)} value={f.lat} onChange={e=>set("lat",e.target.value)} /></FL>
              <FL label="Longitude"><input type="number" step="any" style={inp(false)} value={f.lng} onChange={e=>set("lng",e.target.value)} /></FL>
            </div>
            <PincodeSelector pincode={f.pincode} street={f.street} onPincodeChange={v=>set("pincode",v)} onStreetChange={v=>set("street",v)} accentColor="#2563eb" accentLight="#eff6ff" accentBorder="#bfdbfe" />
          </div>

          {/* Availability */}
          <div style={{ background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>Available for Bookings</div>
              <div style={{ fontSize:12, color:"var(--muted)" }}>Customers can book you when this is on</div>
            </div>
            <label style={{ position:"relative", display:"inline-block", width:44, height:24, cursor:"pointer" }}>
              <input type="checkbox" checked={f.availability} onChange={e=>set("availability",e.target.checked)} style={{ opacity:0, width:0, height:0 }} />
              <span style={{ position:"absolute", inset:0, borderRadius:24, background:f.availability?"#22c55e":"#e2e8f0", transition:"background .2s" }} />
              <span style={{ position:"absolute", top:2, left:f.availability?"calc(100% - 22px)":2, width:20, height:20, borderRadius:"50%", background:"var(--surface)", boxShadow:"0 1px 4px rgba(0,0,0,.2)", transition:"left .2s" }} />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"16px 24px", borderTop:"1px solid #e2e8f0", display:"flex", gap:10, justifyContent:"flex-end", background:"var(--bg)", flexShrink:0 }}>
          <button onClick={onClose} style={{ padding:"10px 20px", borderRadius:9, border:"1.5px solid var(--border)", background:"var(--surface)", fontSize:13, fontWeight:700, cursor:"pointer", color:"var(--muted)", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={handleSave} disabled={busy} style={{ padding:"10px 24px", borderRadius:9, border:"none", background:busy?"#a5b4fc":"linear-gradient(135deg,#2563eb,#4f46e5)", color:"white", fontSize:13, fontWeight:800, cursor:busy?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", display:"flex", alignItems:"center", gap:8, boxShadow:busy?"none":"0 4px 14px rgba(37,99,235,.35)" }}>
            {busy ? <><div style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.4)", borderTopColor:"white", borderRadius:"50%", animation:"spin .7s linear infinite" }} /> Saving…</> : <><Icon name="check" size={14} color="white" /> {isEdit?"Update Profile":"Create Profile"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecLabel({ icon, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, paddingBottom:10, borderBottom:"1.5px solid #f1f5f9" }}>
      <span style={{ fontSize:15 }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:800, color:"var(--text-secondary)", letterSpacing:".06em", textTransform:"uppercase" }}>{label}</span>
    </div>
  );
}

function FL({ label, req, err, children }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:11, fontWeight:800, color:"var(--text-secondary)", marginBottom:6, letterSpacing:".04em", textTransform:"uppercase" }}>
        {label}{req&&<span style={{ color:"#ef4444" }}> *</span>}
      </label>
      {children}
      {err&&<span style={{ color:"#ef4444", fontSize:12, marginTop:4, display:"block" }}>⚠ {err}</span>}
    </div>
  );
}
