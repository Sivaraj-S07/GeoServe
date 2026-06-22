/**
 * routes/categories.js — PostgreSQL version
 */
const express = require("express");
const router  = express.Router();
const path    = require("path");
const fs      = require("fs");
const multer  = require("multer");
const pool    = require("../db/pool");
const { requireRole } = require("../middleware/role");

const ICON_UPLOAD_DIR = path.join(__dirname, "../uploads/categories");

/** Validates a hex color string like #2563eb or #fff. Empty/null/undefined are allowed (means "use automatic theme"). */
function isValidBannerColor(value) {
  if (value === null || value === undefined || value === "") return true;
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}
/** Normalizes a banner color: trims, lowercases, returns null for empty (so DB stores NULL = "automatic theme"). */
function normalizeBannerColor(value) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  return v === "" ? null : v.toLowerCase();
}

const iconStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(ICON_UPLOAD_DIR)) fs.mkdirSync(ICON_UPLOAD_DIR,{recursive:true});
    cb(null, ICON_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = "cat_"+Date.now()+"_"+Math.random().toString(36).slice(2,8)+ext;
    cb(null, safe);
  },
});
const iconFileFilter = (_req, file, cb) => {
  const ok=["image/png","image/jpeg","image/jpg","image/svg+xml","image/webp","image/gif"];
  ok.includes(file.mimetype) ? cb(null,true) : cb(new Error("Only PNG,JPG,SVG,WEBP or GIF allowed"));
};
const uploadIcon = multer({ storage:iconStorage, fileFilter:iconFileFilter, limits:{fileSize:2*1024*1024} });

/* POST /api/categories/upload-icon */
router.post("/upload-icon", requireRole("admin"), (req, res) => {
  uploadIcon.single("icon")(req, res, err => {
    if (err) return res.status(400).json({ error:err.message||"Upload failed" });
    if (!req.file) return res.status(400).json({ error:"No file uploaded" });
    res.status(201).json({ url:`/uploads/categories/${req.file.filename}` });
  });
});

/* GET /api/categories — public */
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categories WHERE enabled=true ORDER BY id");
    res.json(rows.map(c=>({
      id:Number(c.id), name:c.name, icon:c.icon,
      iconType:c.icon_type, bannerColor:c.banner_color, enabled:c.enabled, custom:c.custom,
    })));
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/categories/all — admin */
router.get("/all", requireRole("admin"), async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categories ORDER BY id");
    res.json(rows.map(c=>({
      id:Number(c.id), name:c.name, icon:c.icon,
      iconType:c.icon_type, bannerColor:c.banner_color, enabled:c.enabled, custom:c.custom,
    })));
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* POST /api/categories */
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const { name, icon, iconType, bannerColor } = req.body;
    if (!name||!name.trim()) return res.status(400).json({ error:"Name is required" });
    if (!isValidBannerColor(bannerColor)) return res.status(400).json({ error:"Banner color must be a valid hex color (e.g. #2563eb)" });
    const { rows:dup } = await pool.query("SELECT id FROM categories WHERE LOWER(name)=$1",[name.trim().toLowerCase()]);
    if (dup.length) return res.status(409).json({ error:"Category with this name already exists" });
    const id = Date.now();
    const { rows } = await pool.query(
      `INSERT INTO categories(id,name,icon,icon_type,banner_color,enabled,custom)
       VALUES($1,$2,$3,$4,$5,true,false) RETURNING *`,
      [id, name.trim(), icon||"cat-default", iconType==="image"?"image":"preset", normalizeBannerColor(bannerColor)]
    );
    const c = rows[0];
    res.status(201).json({ id:Number(c.id),name:c.name,icon:c.icon,iconType:c.icon_type,bannerColor:c.banner_color,enabled:c.enabled,custom:c.custom });
  } catch(err) {
    console.error("[categories/post]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PUT /api/categories/:id */
router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rows:existing } = await pool.query("SELECT * FROM categories WHERE id=$1",[id]);
    if (!existing.length) return res.status(404).json({ error:"Category not found" });
    const { name, icon, iconType, bannerColor, enabled, custom } = req.body;
    if (name) {
      const { rows:dup } = await pool.query("SELECT id FROM categories WHERE LOWER(name)=$1 AND id!=$2",[name.trim().toLowerCase(),id]);
      if (dup.length) return res.status(409).json({ error:"Another category with this name already exists" });
    }
    if (bannerColor !== undefined && !isValidBannerColor(bannerColor)) {
      return res.status(400).json({ error:"Banner color must be a valid hex color (e.g. #2563eb)" });
    }
    const c = existing[0];
    const newName    = name ? name.trim() : c.name;
    const newIcon    = icon !== undefined ? icon : c.icon;
    const newEnabled = enabled !== undefined ? enabled : c.enabled;
    const newCustom  = custom  !== undefined ? custom  : c.custom;
    const newBannerColor = bannerColor !== undefined ? normalizeBannerColor(bannerColor) : c.banner_color;
    // Derive iconType from icon URL if not provided
    let newIconType = iconType !== undefined ? iconType : c.icon_type;
    if (icon !== undefined) {
      const looksLikeImage = typeof newIcon==="string" &&
        (newIcon.startsWith("/uploads/")||newIcon.startsWith("http")||newIcon.startsWith("data:"));
      newIconType = looksLikeImage ? "image" : "preset";
    }
    const { rows:updated } = await pool.query(
      `UPDATE categories SET name=$1,icon=$2,icon_type=$3,banner_color=$4,enabled=$5,custom=$6 WHERE id=$7 RETURNING *`,
      [newName,newIcon,newIconType,newBannerColor,newEnabled,newCustom,id]
    );
    const r = updated[0];
    res.json({ id:Number(r.id),name:r.name,icon:r.icon,iconType:r.icon_type,bannerColor:r.banner_color,enabled:r.enabled,custom:r.custom });
  } catch(err) {
    console.error("[categories/put]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PATCH /api/categories/:id/toggle */
router.patch("/:id/toggle", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await pool.query(
      "UPDATE categories SET enabled=NOT enabled WHERE id=$1 RETURNING *",[id]
    );
    if (!rows.length) return res.status(404).json({ error:"Category not found" });
    const c=rows[0];
    res.json({ id:Number(c.id),name:c.name,icon:c.icon,iconType:c.icon_type,bannerColor:c.banner_color,enabled:c.enabled,custom:c.custom });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* DELETE /api/categories/:id */
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rows:target } = await pool.query("SELECT * FROM categories WHERE id=$1",[id]);
    if (!target.length) return res.status(404).json({ error:"Category not found" });
    await pool.query("DELETE FROM categories WHERE id=$1",[id]);
    const t = target[0];
    if (t.icon_type==="image" && typeof t.icon==="string" && t.icon.startsWith("/uploads/categories/")) {
      const fp = path.join(__dirname,"..",t.icon);
      fs.unlink(fp,()=>{});
    }
    res.json({ message:"Deleted" });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

module.exports = router;
