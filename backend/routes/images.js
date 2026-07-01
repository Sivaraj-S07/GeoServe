/**
 * routes/images.js — serves images permanently stored in PostgreSQL.
 *
 * Mounted at /uploads/img so existing frontend code that already recognizes
 * the "/uploads/" URL prefix (category icon previews, etc.) keeps working
 * without any changes — the only difference is the bytes now come from the
 * database instead of an ephemeral local disk folder.
 */
"use strict";

const express = require("express");
const router  = express.Router();
const { getImage } = require("../services/imageStore");

/* GET /uploads/img/:id — public, long-lived cache (images are immutable; a
   new upload always gets a new id, so caching forever is safe). */
router.get("/:id", async (req, res) => {
  try {
    const img = await getImage(req.params.id);
    if (!img) return res.status(404).json({ error: "Image not found" });
    res.set({
      "Content-Type":  img.mime_type || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag":          `"img-${img.id}"`,
    });
    res.send(img.data);
  } catch (err) {
    console.error("[images]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
