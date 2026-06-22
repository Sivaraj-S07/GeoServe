import { useTranslation } from "react-i18next";
/**
 * CategoriesPage.jsx — Admin Category Management
 * Full CRUD: Add / Edit / Enable-Disable / Delete categories
 */
import { useState, useEffect, useRef } from "react";
import * as api from "../api";
import Icon, { ICON_REGISTRY } from "../components/Icon";

/** Returns true if `icon` is a custom uploaded image (URL/path) rather than a preset key. */
function isImageIcon(icon) {
  return typeof icon === "string" && (icon.startsWith("/uploads/") || icon.startsWith("http://") || icon.startsWith("https://") || icon.startsWith("data:"));
}

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");

function resolveIconUrl(icon) {
  if (!icon) return icon;
  if (icon.startsWith("/uploads/")) return `${API_BASE}${icon}`;
  return icon;
}

/** Renders a category icon — either a custom uploaded image or a preset SVG icon. */
function CatIconPreview({ icon, iconType, size = 22, color = "white" }) {
  const showImage = iconType === "image" || isImageIcon(icon);
  if (showImage && icon) {
    return (
      <img
        src={resolveIconUrl(icon)}
        alt=""
        width={size} height={size}
        style={{ objectFit: "contain", borderRadius: 4, display: "block" }}
        onError={e => { e.currentTarget.style.display = "none"; }}
      />
    );
  }
  return <Icon name={icon || "cat-default"} size={size} color={color} strokeWidth={1.9} />;
}

/** Validates a hex color like #2563eb or #fff. */
function isValidHex(value) {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

/** Curated preset swatches shown for quick selection in the banner color picker. */
const BANNER_COLOR_PRESETS = [
  "#0369a1", "#d97706", "#b45309", "#334155", "#0d9488",
  "#db2777", "#16a34a", "#4338ca", "#9333ea", "#dc2626",
  "#0891b2", "#65a30d",
];

/* ── Modal ─────────────────────────────────────────────────────────────── */
function CategoryModal({ mode, category, onSave, onClose, busy }) {
  const { t } = useTranslation();
  const [name, setName] = useState(category?.name || "");
  const [icon, setIcon] = useState(category?.icon || "cat-default");
  const [iconType, setIconType] = useState(isImageIcon(category?.icon) ? "image" : "preset");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(isImageIcon(category?.icon) ? resolveIconUrl(category.icon) : null);
  const [bannerColor, setBannerColor] = useState(isValidHex(category?.bannerColor) ? category.bannerColor : "");
  const [err,  setErr]  = useState("");
  const [tab, setTab] = useState(isImageIcon(category?.icon) ? "image" : "preset");
  const inputRef = useRef();
  const fileRef = useRef();

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErr("Image must be under 2MB"); return; }
    setErr("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setIconType("image");
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setIconType("preset");
    setIcon("cat-default");
    setTab("preset");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSelectPreset = (key) => {
    setIcon(key);
    setIconType("preset");
  };

  const handleSave = () => {
    if (!name.trim()) { setErr(t("category.nameRequired")); return; }
    if (name.trim().length < 2) { setErr("Name must be at least 2 characters"); return; }
    if (name.trim().length > 60) { setErr("Name must be under 60 characters"); return; }
    if (bannerColor && !isValidHex(bannerColor)) { setErr("Banner color must be a valid hex color (e.g. #2563eb)"); return; }
    setErr("");
    onSave({ name: name.trim(), icon, iconType, imageFile, bannerColor: bannerColor || null });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.55)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)", padding:"16px" }}>
      <div style={{ width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", background:"var(--surface)", borderRadius:20, border:"1.5px solid var(--border)", boxShadow:"0 24px 64px rgba(0,0,0,.22)" }}>
        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:"var(--text)", fontFamily:"'Bricolage Grotesque',sans-serif" }}>
              {mode === "add" ? t("category.addCategory") : t("category.editCategory")}
            </div>
            <div style={{ fontSize:12, color:"var(--muted)", marginTop:2 }}>
              {mode === "add" ? "Create a new service category for workers" : "Update category details"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"var(--surface-hover)", border:"none", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--muted)" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:"20px 24px" }}>
          {/* Preview */}
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"var(--primary-bg)", border:"1.5px solid var(--primary-border)", borderRadius:12, marginBottom:20 }}>
            <div style={{ width:46, height:46, borderRadius:12, background: iconType === "image" ? "var(--surface)" : "linear-gradient(135deg,#2563eb,#059669)", border: iconType === "image" ? "1.5px solid var(--border)" : "none", display:"flex", alignItems:"center", justifyContent:"center", boxShadow: iconType === "image" ? "none" : "0 4px 12px rgba(37,99,235,.30)", flexShrink:0, overflow:"hidden" }}>
              <CatIconPreview icon={iconType === "image" ? imagePreview : icon} iconType={iconType} size={iconType === "image" ? 46 : 22} color="white" />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"var(--text)" }}>{name || "Category Preview"}</div>
              <div style={{ fontSize:11, color:"var(--muted)", marginTop:1 }}>Service Category</div>
            </div>
          </div>

          {/* Name field */}
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:12.5, fontWeight:700, color:"var(--text-secondary)", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>
              Category Name *
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => { setName(e.target.value); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              placeholder="e.g. Plumber, Electrician, AC Repair…"
              style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${err ? "#ef4444" : "var(--border)"}`, background:"var(--bg)", color:"var(--text)", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box", transition:"border-color .15s" }}
              onFocus={e => e.target.style.borderColor = err ? "#ef4444" : "var(--primary)"}
              onBlur={e => e.target.style.borderColor = err ? "#ef4444" : "var(--border)"}
            />
          </div>

          {/* Icon tabs */}
          <div style={{ marginBottom: err ? 8 : 0 }}>
            <label style={{ display:"block", fontSize:12.5, fontWeight:700, color:"var(--text-secondary)", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>
              Category Icon
            </label>

            <div style={{ display:"flex", gap:6, marginBottom:12, background:"var(--bg)", padding:4, borderRadius:10, border:"1px solid var(--border)" }}>
              {[{ id:"preset", label:t("category.chooseIcon") }, { id:"image", label:"Upload Image" }].map(opt => (
                <button key={opt.id} onClick={() => setTab(opt.id)}
                  style={{ flex:1, padding:"7px 0", borderRadius:8, border:"none", cursor:"pointer", fontSize:12.5, fontWeight:700, fontFamily:"inherit",
                    background: tab===opt.id ? "var(--surface)" : "transparent",
                    color: tab===opt.id ? "var(--primary)" : "var(--muted)",
                    boxShadow: tab===opt.id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                    transition:"all .13s" }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {tab === "preset" ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, maxHeight:220, overflowY:"auto", padding:2 }}>
                {ICON_REGISTRY.map(opt => (
                  <button key={opt.key} onClick={() => handleSelectPreset(opt.key)} title={opt.label}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 4px", borderRadius:10, border:`1.5px solid ${iconType==="preset" && icon===opt.key ? "var(--primary)" : "var(--border)"}`, background: iconType==="preset" && icon===opt.key ? "var(--primary-bg)" : "var(--bg)", cursor:"pointer", transition:"all .13s" }}>
                    <Icon name={opt.key} size={18} color={iconType==="preset" && icon===opt.key ? "var(--primary)" : "var(--muted)"} />
                    <span style={{ fontSize:9, fontWeight:600, color: iconType==="preset" && icon===opt.key ? "var(--primary)" : "var(--muted)", lineHeight:1.2, textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", width:"100%" }}>{opt.label.split(" / ")[0]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                {imagePreview ? (
                  <div style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px", border:"1.5px solid var(--border)", borderRadius:12, background:"var(--bg)" }}>
                    <div style={{ width:56, height:56, borderRadius:12, border:"1px solid var(--border)", background:"var(--surface)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
                      <img src={imagePreview} alt="Category icon" width={56} height={56} style={{ objectFit:"contain" }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12.5, fontWeight:700, color:"var(--text)", marginBottom:6 }}>Custom icon ready</div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => fileRef.current?.click()}
                          style={{ padding:"6px 12px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface)", cursor:"pointer", fontSize:12, fontWeight:700, color:"var(--text-secondary)", fontFamily:"inherit" }}>
                          Replace
                        </button>
                        <button onClick={handleRemoveImage}
                          style={{ padding:"6px 12px", borderRadius:8, border:"1px solid #fecaca", background:"#fef2f2", cursor:"pointer", fontSize:12, fontWeight:700, color:"#dc2626", fontFamily:"inherit" }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    style={{ width:"100%", padding:"22px 14px", borderRadius:12, border:"1.5px dashed var(--border)", background:"var(--bg)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:6, color:"var(--muted)", fontFamily:"inherit" }}>
                    <Icon name="upload" size={22} color="var(--muted)" />
                    <span style={{ fontSize:12.5, fontWeight:700 }}>Click to upload an icon image</span>
                    <span style={{ fontSize:11 }}>PNG, JPG, SVG, or WEBP — up to 2MB</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/gif" onChange={handleFileChange} style={{ display:"none" }} />
              </div>
            )}
          </div>

          {/* Banner Color */}
          <div style={{ marginTop:20 }}>
            <label style={{ display:"block", fontSize:12.5, fontWeight:700, color:"var(--text-secondary)", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>
              Banner Color
            </label>
            <div style={{ fontSize:11.5, color:"var(--muted)", marginBottom:10, lineHeight:1.5 }}>
              Sets the background color of this category's banner everywhere it's shown — worker profiles, booking pages, and dashboards.
            </div>

            {/* Live preview strip */}
            <div style={{
              height:48, borderRadius:10, marginBottom:12, position:"relative", overflow:"hidden",
              background: isValidHex(bannerColor)
                ? `linear-gradient(135deg, ${bannerColor}cc 0%, ${bannerColor} 55%, ${bannerColor}99 100%)`
                : "linear-gradient(135deg,#1e293b 0%,#475569 50%,#94a3b8 100%)",
              display:"flex", alignItems:"center", justifyContent:"flex-end", padding:"0 14px",
            }}>
              <span style={{ color:"#fff", fontWeight:800, fontSize:11.5, letterSpacing:".04em", textTransform:"uppercase", textShadow:"0 2px 8px rgba(0,0,0,.4)" }}>
                {bannerColor ? "Custom color" : "Automatic theme"}
              </span>
            </div>

            {/* Preset swatches */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
              {BANNER_COLOR_PRESETS.map(c => (
                <button key={c} type="button" title={c} onClick={() => setBannerColor(c)}
                  style={{
                    width:28, height:28, borderRadius:8, border: bannerColor===c ? "2.5px solid var(--text)" : "1.5px solid var(--border)",
                    background:c, cursor:"pointer", padding:0,
                    boxShadow: bannerColor===c ? "0 0 0 2px var(--surface)" : "none",
                  }}
                />
              ))}
            </div>

            {/* Custom color + hex input + reset */}
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <input
                type="color"
                value={isValidHex(bannerColor) ? bannerColor : "#2563eb"}
                onChange={e => setBannerColor(e.target.value)}
                style={{ width:40, height:36, padding:0, border:"1.5px solid var(--border)", borderRadius:8, cursor:"pointer", background:"none" }}
              />
              <input
                value={bannerColor}
                onChange={e => { setBannerColor(e.target.value); setErr(""); }}
                placeholder="#2563eb"
                maxLength={7}
                style={{ flex:"1 1 120px", minWidth:100, padding:"8px 12px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:13, fontFamily:"monospace", outline:"none" }}
              />
              <button type="button" onClick={() => setBannerColor("")}
                style={{ padding:"8px 14px", borderRadius:8, border:"1.5px solid var(--border)", background:"none", cursor:"pointer", fontSize:12, fontWeight:700, color:"var(--text-secondary)", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                ↺ Use Automatic
              </button>
            </div>
          </div>

          {err && <div style={{ marginTop:14, padding:"8px 12px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, fontSize:12.5, color:"#dc2626", fontWeight:600 }}>{err}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px 20px", borderTop:"1px solid var(--border)", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} disabled={busy}
            style={{ padding:"9px 20px", borderRadius:10, border:"1.5px solid var(--border)", background:"none", cursor:"pointer", fontSize:13.5, fontWeight:700, color:"var(--muted)", fontFamily:"inherit" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={busy}
            style={{ padding:"9px 22px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#2563eb,#059669)", color:"white", cursor:"pointer", fontSize:13.5, fontWeight:700, fontFamily:"inherit", boxShadow:"0 4px 12px rgba(37,99,235,.35)", opacity: busy ? .7 : 1, display:"flex", alignItems:"center", gap:8 }}>
            {busy ? t("common.saving") : mode === "add" ? `✓ ${t("category.addCategory")}` : `✓ ${t("common.save")}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Confirm ─────────────────────────────────────────────────────── */
function DeleteModal({ category, onConfirm, onClose, busy }) {
  const { t } = useTranslation();
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,23,42,.55)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)", padding:"16px" }}>
      <div style={{ width:"100%", maxWidth:380, background:"var(--surface)", borderRadius:20, border:"1.5px solid var(--border)", boxShadow:"0 24px 64px rgba(0,0,0,.22)", overflow:"hidden" }}>
        <div style={{ padding:"20px 24px 16px", textAlign:"center" }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:"#fef2f2", border:"1.5px solid #fecaca", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:24 }}>🗑️</div>
          <div style={{ fontSize:16, fontWeight:800, color:"var(--text)", marginBottom:8, fontFamily:"'Bricolage Grotesque',sans-serif" }}>Delete Category?</div>
          <div style={{ fontSize:13.5, color:"var(--muted)", lineHeight:1.6 }}>
            Are you sure you want to delete <strong style={{ color:"var(--text)" }}>{category.name}</strong>?<br />
            This cannot be undone. Workers using this category will be affected.
          </div>
        </div>
        <div style={{ padding:"0 24px 20px", display:"flex", gap:10 }}>
          <button onClick={onClose} disabled={busy}
            style={{ flex:1, padding:"10px", borderRadius:10, border:"1.5px solid var(--border)", background:"none", cursor:"pointer", fontSize:13.5, fontWeight:700, color:"var(--muted)", fontFamily:"inherit" }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={busy}
            style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:"#dc2626", color:"white", cursor:"pointer", fontSize:13.5, fontWeight:700, fontFamily:"inherit", opacity: busy ? .7 : 1 }}>
            {busy ? t("common.updating") : t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */
export default function CategoriesPage({ onToast }) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal,    setModal]        = useState(null); // { mode:"add"|"edit", cat? }
  const [delModal, setDelModal]     = useState(null); // category to delete
  const [busy,     setBusy]         = useState(false);
  const [search,   setSearch]       = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getAllCategories();
      setCategories(data);
    } catch {
      onToast?.("Failed to load categories", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const enabled  = categories.filter(c => c.enabled !== false).length;
  const disabled = categories.length - enabled;
  const custom   = categories.filter(c => c.custom).length;

  const handleSave = async ({ name, icon, iconType, imageFile, bannerColor }) => {
    setBusy(true);
    try {
      let finalIcon = icon;
      let finalIconType = iconType;
      if (iconType === "image" && imageFile) {
        const { url } = await api.uploadCategoryIcon(imageFile);
        finalIcon = url;
        finalIconType = "image";
      }
      const payload = { name, icon: finalIcon, iconType: finalIconType, bannerColor: bannerColor || null };
      if (modal.mode === "add") {
        const cat = await api.createCategory(payload);
        setCategories(prev => [...prev, cat]);
        onToast?.(`Category "${name}" added successfully`);
      } else {
        const cat = await api.updateCategory(modal.cat.id, payload);
        setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
        onToast?.(`Category "${name}" updated`);
      }
      setModal(null);
    } catch (e) {
      onToast?.(e.message || "Failed to save category", "error");
    } finally { setBusy(false); }
  };

  const handleToggle = async (cat) => {
    try {
      const updated = await api.toggleCategory(cat.id);
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      onToast?.(`"${cat.name}" ${updated.enabled ? "enabled" : "disabled"}`);
    } catch {
      onToast?.("Failed to toggle category", "error");
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await api.deleteCategory(delModal.id);
      setCategories(prev => prev.filter(c => c.id !== delModal.id));
      onToast?.(`Category "${delModal.name}" deleted`);
      setDelModal(null);
    } catch (e) {
      onToast?.(e.message || "Failed to delete", "error");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding:"28px 28px 40px", maxWidth:1100, margin:"0 auto" }}>

      {/* Page header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14, marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:"var(--text)", fontFamily:"'Bricolage Grotesque',sans-serif", margin:0, letterSpacing:-.5 }}>
            🗂️ Category Management
          </h1>
          <p style={{ color:"var(--muted)", fontSize:13.5, marginTop:4 }}>
            Manage all worker service categories available across the platform.
          </p>
        </div>
        <button
          onClick={() => setModal({ mode:"add" })}
          style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#2563eb,#059669)", color:"white", fontWeight:700, fontSize:14, cursor:"pointer", boxShadow:"0 4px 14px rgba(37,99,235,.35)", fontFamily:"inherit", flexShrink:0 }}>
          + Add Category
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:22 }}>
        {[
          { label:"Total",    value:categories.length, color:"var(--primary)",  bg:"var(--primary-bg)",  border:"var(--primary-border)",  emoji:"🗂️" },
          { label:"Active",   value:enabled,           color:"var(--green)",    bg:"var(--green-bg)",    border:"var(--green-border)",    emoji:"✅" },
          { label:"Disabled", value:disabled,          color:"var(--red)",      bg:"var(--red-bg)",      border:"var(--red-border)",      emoji:"🚫" },
          { label:"Custom",   value:custom,            color:"#7c3aed",         bg:"#ede9fe",            border:"#ddd6fe",                emoji:"⚙️" },
        ].map(s => (
          <div key={s.label} style={{ padding:"14px 16px", background:s.bg, border:`1.5px solid ${s.border}`, borderRadius:14 }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.emoji}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.color, fontFamily:"'Bricolage Grotesque',sans-serif" }}>{s.value}</div>
            <div style={{ fontSize:12, color:s.color, fontWeight:600, opacity:.8 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ marginBottom:18 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search categories…"
          style={{ width:"100%", maxWidth:340, padding:"9px 14px", borderRadius:10, border:"1.5px solid var(--border)", background:"var(--bg)", color:"var(--text)", fontSize:14, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
        />
      </div>

      {/* Category list */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)", fontSize:14 }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
          Loading categories…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"var(--muted)" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>{search ? "🔍" : "🗂️"}</div>
          <div style={{ fontSize:16, fontWeight:700, color:"var(--text)", marginBottom:6 }}>
            {search ? "No matches found" : "No categories yet"}
          </div>
          <div style={{ fontSize:13.5 }}>
            {search ? "Try a different search term" : "Click \"Add Category\" to create the first one."}
          </div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
          {filtered.map(cat => {
            const isEnabled = cat.enabled !== false;
            return (
              <div key={cat.id} style={{
                background:"var(--surface)",
                border:`1.5px solid ${isEnabled ? "var(--border)" : "var(--border-light)"}`,
                borderRadius:16,
                padding:"16px 18px",
                opacity: isEnabled ? 1 : .65,
                transition:"all .15s",
                display:"flex", flexDirection:"column", gap:12,
              }}>
                {/* Top row */}
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:56, height:56, borderRadius:14, background: isEnabled ? "linear-gradient(135deg,#2563eb,#059669)" : "var(--surface-hover)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow: isEnabled ? "0 3px 10px rgba(37,99,235,.25)" : "none", overflow:"hidden", position:"relative" }}>
                    <CatIconPreview icon={cat.icon} iconType={cat.iconType} size={isImageIcon(cat.icon) || cat.iconType === "image" ? 56 : 28} color={isEnabled ? "white" : "var(--muted)"} />
                    {isValidHex(cat.bannerColor) && (
                      <span title={`Banner color: ${cat.bannerColor}`} style={{
                        position:"absolute", bottom:3, right:3, width:14, height:14, borderRadius:"50%",
                        background:cat.bannerColor, border:"2px solid var(--surface)", boxShadow:"0 1px 3px rgba(0,0,0,.3)",
                      }} />
                    )}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:"var(--text)", fontFamily:"'Bricolage Grotesque',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {cat.name}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10.5, padding:"2px 8px", borderRadius:20, fontWeight:700, background: isEnabled ? "var(--green-bg)" : "var(--surface-hover)", color: isEnabled ? "var(--green)" : "var(--muted)", border:`1px solid ${isEnabled ? "var(--green-border)" : "var(--border)"}` }}>
                        {isEnabled ? "Active" : "Disabled"}
                      </span>
                      {cat.custom && (
                        <span style={{ fontSize:10.5, padding:"2px 8px", borderRadius:20, fontWeight:700, background:"#ede9fe", color:"#7c3aed", border:"1px solid #ddd6fe" }}>
                          Custom
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display:"flex", gap:7, borderTop:"1px solid var(--border-light)", paddingTop:10 }}>
                  <button onClick={() => setModal({ mode:"edit", cat })}
                    style={{ flex:1, padding:"7px 0", borderRadius:9, border:"1.5px solid var(--border)", background:"none", cursor:"pointer", fontSize:12.5, fontWeight:700, color:"var(--text-secondary)", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:5, transition:"all .13s" }}
                    onMouseEnter={e => { e.currentTarget.style.background="var(--primary-bg)"; e.currentTarget.style.borderColor="var(--primary-border)"; e.currentTarget.style.color="var(--primary)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text-secondary)"; }}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleToggle(cat)}
                    style={{ flex:1, padding:"7px 0", borderRadius:9, border:`1.5px solid ${isEnabled ? "var(--border)" : "var(--green-border)"}`, background: isEnabled ? "none" : "var(--green-bg)", cursor:"pointer", fontSize:12.5, fontWeight:700, color: isEnabled ? "var(--muted)" : "var(--green)", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:5, transition:"all .13s" }}>
                    {isEnabled ? "⏸ Disable" : "▶ Enable"}
                  </button>
                  <button onClick={() => setDelModal(cat)}
                    style={{ width:36, height:36, borderRadius:9, border:"1.5px solid var(--border)", background:"none", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .13s" }}
                    onMouseEnter={e => { e.currentTarget.style.background="#fef2f2"; e.currentTarget.style.borderColor="#fecaca"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="none"; e.currentTarget.style.borderColor="var(--border)"; }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {modal && (
        <CategoryModal
          mode={modal.mode}
          category={modal.cat}
          onSave={handleSave}
          onClose={() => setModal(null)}
          busy={busy}
        />
      )}
      {delModal && (
        <DeleteModal
          category={delModal}
          onConfirm={handleDelete}
          onClose={() => setDelModal(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
