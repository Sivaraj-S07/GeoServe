const express = require("express");
const router  = express.Router();
const fs      = require("fs");
const path    = require("path");
const { requireRole } = require("../middleware/role");

const FILE  = path.join(__dirname, "../data/categories.json");
const read  = () => JSON.parse(fs.readFileSync(FILE, "utf-8"));
const write = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

/* GET /api/categories — public */
router.get("/", (_req, res) => res.json(read()));

/* POST /api/categories — admin only */
router.post("/", requireRole("admin"), (req, res) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const cats = read();
  const newCat = { id: Date.now(), name: name.trim(), icon: icon || "globe" };
  cats.push(newCat);
  write(cats);
  res.status(201).json(newCat);
});

/* PUT /api/categories/:id — admin only */
router.put("/:id", requireRole("admin"), (req, res) => {
  const id   = parseInt(req.params.id);
  const cats = read();
  const idx  = cats.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: "Category not found" });
  cats[idx] = { ...cats[idx], ...req.body, id };
  write(cats);
  res.json(cats[idx]);
});

/* DELETE /api/categories/:id — admin only */
router.delete("/:id", requireRole("admin"), (req, res) => {
  const id       = parseInt(req.params.id);
  const cats     = read();
  const filtered = cats.filter(c => c.id !== id);
  if (filtered.length === cats.length) return res.status(404).json({ error: "Category not found" });
  write(filtered);
  res.json({ message: "Deleted" });
});

module.exports = router;
