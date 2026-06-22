import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import Icon, { ICON_REGISTRY, getCategoryIcon, isImageIcon, resolveIconUrl } from "./Icon";
import { uploadCategoryIcon } from "../api";

/* ─── Searchable Icon Picker ──────────────────────────────────────────────── */
function IconPicker({ value, onChange }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return ICON_REGISTRY;
    return ICON_REGISTRY.filter(
      r => r.label.toLowerCase().includes(q) || r.tags.some(tag => tag.includes(q))
    );
  }, [query]);

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <Icon name="search" size={14} color="var(--muted)" />
        </span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t("category.searchIconsPlaceholder")}
          style={{ paddingLeft: 32, fontSize: 13, height: 36 }}
        />
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
        gap: 8,
        maxHeight: 220,
        overflowY: "auto",
        padding: "4px 2px",
      }}>
        {filtered.map(r => {
          const active = value === r.key;
          return (
            <button
              key={r.key}
              type="button"
              title={r.label}
              onClick={() => onChange(r.key)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 5, padding: "10px 6px 8px",
                border: `2px solid ${active ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 10,
                background: active ? "var(--primary-bg)" : "var(--surface)",
                cursor: "pointer", transition: "all .15s",
                boxShadow: active ? "0 2px 8px rgba(37,99,235,.15)" : "none",
              }}
            >
              <Icon name={r.key} size={22} color={active ? "var(--primary)" : "var(--muted)"} strokeWidth={1.8} />
              <span style={{
                fontSize: 9, fontWeight: 600,
                color: active ? "var(--primary)" : "var(--muted)",
                textAlign: "center", lineHeight: 1.2,
                fontFamily: "'Manrope',sans-serif",
                wordBreak: "break-word",
              }}>
                {r.label.split(" / ")[0]}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{
            gridColumn: "1/-1", textAlign: "center",
            color: "var(--muted)", fontSize: 13, padding: "20px 0",
          }}>
            {t("category.noIconsMatch")}"{query}"
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Category Create / Edit Modal ───────────────────────────────────────── */
export function CategoryModal({ category, onSave, onClose }) {
  const { t } = useTranslation();
  const isEdit = Boolean(category?.id);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("cat-default");
  // customImageIcon = the persisted /uploads/... URL (from DB or just uploaded)
  const [customImageIcon, setCustomImageIcon] = useState(null);
  // localPreview = a blob: URL for instant preview before save
  const [localPreview, setLocalPreview] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (category) {
      setName(category.name || "");
      if (isImageIcon(category.icon)) {
        setCustomImageIcon(category.icon);
        setIcon(getCategoryIcon(category.name || ""));
      } else {
        setCustomImageIcon(null);
        const resolved = getCategoryIcon(category.icon || category.name || "");
        setIcon(resolved);
      }
    } else {
      setName(""); setIcon("cat-default"); setCustomImageIcon(null);
    }
    setLocalPreview(null);
    setUploadErr("");
    setErr("");
  }, [category]);

  // Auto-suggest icon when name changes (only for new categories)
  useEffect(() => {
    if (name && !category?.id) {
      const suggested = getCategoryIcon(name);
      if (suggested !== "cat-default") setIcon(suggested);
    }
  }, [name]);

  // Clean up blob URL on unmount / change
  useEffect(() => {
    return () => { if (localPreview) URL.revokeObjectURL(localPreview); };
  }, [localPreview]);

  const handleIconChange = (key) => {
    setIcon(key);
    setCustomImageIcon(null);
    if (localPreview) { URL.revokeObjectURL(localPreview); setLocalPreview(null); }
    setUploadErr("");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate locally first
    const allowed = ["image/png","image/jpeg","image/jpg","image/svg+xml","image/webp","image/gif"];
    if (!allowed.includes(file.type)) {
      setUploadErr("Only PNG, JPG, SVG, WEBP or GIF images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadErr("Image must be under 2 MB.");
      return;
    }

    // Show instant local preview
    if (localPreview) URL.revokeObjectURL(localPreview);
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    setUploadErr("");
    setUploadBusy(true);

    try {
      const { url } = await uploadCategoryIcon(file);
      setCustomImageIcon(url);
      // Keep localPreview until onSave clears the modal — gives smooth UX
    } catch (e) {
      setUploadErr(e.message || "Upload failed. Please try again.");
      // Revert preview
      URL.revokeObjectURL(preview);
      setLocalPreview(null);
    } finally {
      setUploadBusy(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    setCustomImageIcon(null);
    if (localPreview) { URL.revokeObjectURL(localPreview); setLocalPreview(null); }
    setUploadErr("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!name.trim()) { setErr(t("category.nameRequired")); return; }
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        icon: customImageIcon || icon,
        iconType: customImageIcon ? "image" : "preset",
      });
    } finally {
      setBusy(false);
    }
  };

  // What to show in the preview bubble
  const previewSrc = localPreview || (customImageIcon ? resolveIconUrl(customImageIcon) : null);
  const selectedEntry = ICON_REGISTRY.find(r => r.key === icon) || ICON_REGISTRY[ICON_REGISTRY.length - 1];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460, width: "100%" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontWeight: 800, fontSize: 18, letterSpacing: -.3 }}>
            {isEdit ? t("category.editCategory") : t("category.addCategory")}
          </h2>
          <button className="icon-btn" onClick={onClose} type="button">
            <Icon name="x" size={17} />
          </button>
        </div>

        {/* Form error */}
        {err && (
          <div style={{
            background: "var(--red-soft)", border: "1px solid var(--red-light)",
            borderRadius: 8, padding: "8px 12px", color: "var(--red)",
            fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 6,
          }}>
            <Icon name="alert-circle" size={14} color="var(--red)" /> {err}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Name field */}
          <div>
            <label>{t("category.nameLabel")}</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t("category.namePlaceholder")}
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleSave()}
            />
          </div>

          {/* ── Image Upload Section ───────────────────────────────────── */}
          <div>
            <label style={{ marginBottom: 8, display: "block", fontWeight: 700, fontSize: 13 }}>
              Category Image <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional — replaces icon)</span>
            </label>

            {/* Current image display + remove */}
            {previewSrc ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", marginBottom: 10,
                background: "var(--green-soft, #f0fdf4)",
                border: "1.5px solid var(--green-light, #bbf7d0)",
                borderRadius: 12,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12, overflow: "hidden",
                  border: "1.5px solid var(--border)", background: "white",
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <img
                    src={previewSrc}
                    alt="category"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 2 }}>
                    {uploadBusy ? "Uploading…" : "Custom image set"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {uploadBusy
                      ? "Please wait while the image uploads."
                      : "This image will be used across all dashboards."}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadBusy}
                    style={{
                      background: "var(--primary-bg)", border: "1.5px solid var(--primary-border)",
                      borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700,
                      cursor: "pointer", color: "var(--primary)", fontFamily: "inherit",
                      opacity: uploadBusy ? 0.5 : 1,
                    }}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={uploadBusy}
                    style={{
                      background: "var(--red-soft, #fef2f2)", border: "1.5px solid var(--red-light, #fca5a5)",
                      borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700,
                      cursor: "pointer", color: "var(--red, #dc2626)", fontFamily: "inherit",
                      opacity: uploadBusy ? 0.5 : 1,
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%", padding: "16px 12px", marginBottom: 10,
                  border: "2px dashed var(--border)", borderRadius: 12,
                  background: "var(--surface)", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  transition: "border-color .15s, background .15s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "var(--primary-bg)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface)"; }}
              >
                <Icon name="upload" size={22} color="var(--muted)" />
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
                  Click to upload a category image
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  PNG, JPG, WEBP, SVG or GIF — max 2 MB
                </div>
              </button>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {/* Upload error */}
            {uploadErr && (
              <div style={{
                background: "var(--red-soft, #fef2f2)", border: "1px solid var(--red-light, #fca5a5)",
                borderRadius: 8, padding: "7px 10px", color: "var(--red, #dc2626)",
                fontSize: 12, marginTop: 6, display: "flex", alignItems: "center", gap: 5,
              }}>
                <Icon name="alert-circle" size={13} color="var(--red, #dc2626)" /> {uploadErr}
              </div>
            )}
          </div>

          {/* ── Preset Icon picker (only shown when no custom image) ─── */}
          {!previewSrc && (
            <div>
              <label style={{ marginBottom: 8, display: "block", fontWeight: 700, fontSize: 13 }}>
                {t("category.chooseIcon")}
                <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 4 }}>
                  (used when no image is uploaded)
                </span>
              </label>
              <IconPicker value={icon} onChange={handleIconChange} />
            </div>
          )}

          {/* Live preview */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px",
            background: "var(--primary-bg)",
            borderRadius: 12,
            border: "1px solid var(--primary-border)",
          }}>
            <div style={{
              width: 68, height: 68, borderRadius: 16,
              background: previewSrc ? "var(--surface)" : "var(--primary)", border: "2px solid var(--primary-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 16px rgba(37,99,235,.22)", flexShrink: 0, overflow: "hidden",
            }}>
              {previewSrc
                ? <img src={previewSrc} alt="" width={68} height={68} style={{ objectFit: "cover", borderRadius: 14, display: "block" }} />
                : <Icon name={icon} size={30} color="white" strokeWidth={1.8} />}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Manrope',sans-serif", color: "var(--text)" }}>
                {name || t("category.nameLabel").replace(" *", "")}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {previewSrc
                  ? (uploadBusy ? "Uploading image…" : "Custom uploaded image")
                  : selectedEntry.label}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 10, justifyContent: "flex-end",
          marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)",
        }}>
          <button className="btn-outline" onClick={onClose} type="button">{t("common.cancel")}</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={busy || uploadBusy}
            type="button"
          >
            <Icon name="check" size={14} color="white" />
            {busy ? t("category.savingLabel") : isEdit ? t("category.updateLabel") : t("category.addCategory")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Confirm Dialog ─────────────────────────────────────────────────────── */
export function ConfirmDialog({ message, onConfirm, onClose, dangerous = true }) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 380, textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 56, height: 56,
          background: dangerous ? "var(--red-soft)" : "var(--amber-soft)",
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <Icon
            name={dangerous ? "trash" : "alert-circle"}
            size={24}
            color={dangerous ? "var(--red)" : "var(--amber)"}
          />
        </div>
        <h3 style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>
          {dangerous ? t("category.confirmDelete") : t("category.confirmAction")}
        </h3>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn-outline" onClick={onClose} type="button">{t("common.cancel")}</button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              background: dangerous ? "var(--red)" : "var(--amber)",
              color: "white", border: "none",
              borderRadius: 10, padding: "10px 24px",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {dangerous ? t("category.yesDelete") : t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
