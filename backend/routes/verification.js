/**
 * routes/verification.js — PostgreSQL version
 */
const express  = require("express");
const router   = express.Router();
const path     = require("path");
const fs       = require("fs");
const multer   = require("multer");
const jwt      = require("jsonwebtoken");
const pool     = require("../db/pool");
const { verifyToken }  = require("../middleware/auth");
const { requireRole }  = require("../middleware/role");
const { SECRET }       = require("../middleware/auth");

const UPLOAD_DIR = path.join(__dirname, "../uploads/verifications");

const storage = multer.diskStorage({
  destination: (_req,_file,cb)=>{ if(!fs.existsSync(UPLOAD_DIR))fs.mkdirSync(UPLOAD_DIR,{recursive:true}); cb(null,UPLOAD_DIR); },
  filename: (_req,file,cb)=>{ const ext=path.extname(file.originalname).toLowerCase(); cb(null,Date.now()+"_"+Math.random().toString(36).slice(2,8)+ext); },
});
const fileFilter=(_req,file,cb)=>{
  const ok=["image/jpeg","image/jpg","image/png","image/webp","application/pdf","video/mp4","video/webm","video/quicktime","video/avi"];
  ok.includes(file.mimetype)?cb(null,true):cb(new Error("Only images, PDFs, and videos are allowed"));
};
const upload=multer({storage,fileFilter,limits:{fileSize:10*1024*1024}});

function toJS(v) {
  return {
    id:Number(v.id),workerId:Number(v.worker_id),workerName:v.worker_name,
    workerEmail:v.worker_email,workerPhone:v.worker_phone,
    categoryId:v.category_id?Number(v.category_id):null,
    certificate_file:v.certificate_file,certificate_mimetype:v.certificate_mimetype,
    certificate_originalname:v.certificate_originalname,
    work_video:v.work_video,video_mimetype:v.video_mimetype,video_originalname:v.video_originalname,
    verification_status:v.verification_status,admin_approval_status:v.admin_approval_status,
    admin_notes:v.admin_notes,reviewed_at:v.reviewed_at,
    verification_submitted_at:v.verification_submitted_at,
  };
}

/* POST /api/verification/submit */
router.post("/submit", verifyToken, upload.fields([{name:"certificate",maxCount:1},{name:"work_video",maxCount:1}]), async (req, res) => {
  try {
    if (req.user.role!=="worker") return res.status(403).json({ error:"Workers only" });
    const { rows:wr } = await pool.query("SELECT * FROM workers WHERE user_id=$1",[req.user.id]);
    if (!wr.length) return res.status(404).json({ error:"Worker profile not found" });
    const worker=wr[0];

    const certFile=req.files?.certificate?.[0];
    const videoFile=req.files?.work_video?.[0];
    if (!certFile&&!videoFile) return res.status(400).json({ error:"Please upload a certificate or a work video" });

    await pool.query("DELETE FROM verifications WHERE worker_id=$1",[worker.id]);

    const id=Date.now();
    const { rows } = await pool.query(
      `INSERT INTO verifications(id,worker_id,worker_name,worker_email,worker_phone,category_id,
         certificate_file,certificate_mimetype,certificate_originalname,work_video,video_mimetype,
         video_originalname,verification_status,admin_approval_status,admin_notes,verification_submitted_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending','pending','',NOW()) RETURNING *`,
      [id,worker.id,worker.name,worker.email,worker.phone||"",worker.category_id||null,
       certFile?.filename||null,certFile?.mimetype||null,certFile?.originalname||null,
       videoFile?.filename||null,videoFile?.mimetype||null,videoFile?.originalname||null]
    );
    await pool.query(
      "UPDATE workers SET verification_status='pending',admin_approval_status='pending',verification_submitted_at=NOW() WHERE id=$1",
      [worker.id]
    );

    if (req.app.locals.addAdminNotification) req.app.locals.addAdminNotification({
      type:"verification_submitted",title:"Worker Verification Request",
      message:`${worker.name||"A worker"} submitted documents for verification.`,link:"/verification",
    });
    if (req.app.locals.pushAdminNotification) req.app.locals.pushAdminNotification({
      type:"verification_submitted",worker:{id:Number(worker.id),name:worker.name},
    });
    res.status(201).json({ message:"Verification submitted successfully", record:toJS(rows[0]) });
  } catch(err) {
    console.error("[verification/submit]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/verification/my */
router.get("/my", verifyToken, async (req, res) => {
  try {
    if (req.user.role!=="worker") return res.status(403).json({ error:"Workers only" });
    const { rows:wr } = await pool.query("SELECT * FROM workers WHERE user_id=$1",[req.user.id]);
    if (!wr.length) return res.status(404).json({ error:"Worker profile not found" });
    const worker=wr[0];
    const { rows:vr } = await pool.query("SELECT * FROM verifications WHERE worker_id=$1",[worker.id]);
    res.json({
      verification_status:worker.verification_status||"unverified",
      admin_approval_status:worker.admin_approval_status||"none",
      record:vr.length?toJS(vr[0]):null,
    });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/verification/all */
router.get("/all", requireRole("admin"), async (req, res) => {
  try {
    const { status } = req.query;
    let q="SELECT v.*,w.availability as worker_availability,w.approved as worker_approved,w.rating as worker_rating FROM verifications v LEFT JOIN workers w ON w.id=v.worker_id";
    const params=[];
    if (status&&status!=="all") { q+=" WHERE v.verification_status=$1"; params.push(status); }
    q+=" ORDER BY v.verification_submitted_at DESC";
    const { rows } = await pool.query(q,params);
    res.json(rows.map(v=>({...toJS(v),worker_availability:v.worker_availability,worker_approved:v.worker_approved,worker_rating:v.worker_rating})));
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/verification/stats */
router.get("/stats", requireRole("admin"), async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT verification_status FROM verifications");
    res.json({
      total:rows.length,
      pending:rows.filter(v=>v.verification_status==="pending").length,
      verified:rows.filter(v=>v.verification_status==="verified").length,
      rejected:rows.filter(v=>v.verification_status==="rejected").length,
    });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/verification/file/:filename */
router.get("/file/:filename", (req, res, next) => {
  const authHeader=req.headers["authorization"];
  const queryToken=req.query.token;
  const token=authHeader?.startsWith("Bearer ")?authHeader.slice(7):queryToken;
  if (!token) return res.status(401).json({ error:"No token provided" });
  try { req.user=jwt.verify(token,SECRET); next(); } catch { return res.status(401).json({ error:"Invalid token" }); }
}, async (req, res) => {
  try {
    const filename=path.basename(req.params.filename);
    const filePath=path.join(UPLOAD_DIR,filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error:"File not found" });
    if (req.user.role!=="admin") {
      const { rows:wr } = await pool.query("SELECT id FROM workers WHERE user_id=$1",[req.user.id]);
      if (!wr.length) return res.status(403).json({ error:"Access denied" });
      const { rows:vr } = await pool.query(
        "SELECT id FROM verifications WHERE worker_id=$1 AND (certificate_file=$2 OR work_video=$2)",
        [wr[0].id,filename]
      );
      if (!vr.length) return res.status(403).json({ error:"Access denied" });
    }
    res.sendFile(filePath);
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PATCH /api/verification/:workerId/approve */
router.patch("/:workerId/approve", requireRole("admin"), async (req, res) => {
  try {
    const workerId=parseInt(req.params.workerId);
    const { notes="" } = req.body;
    const { rows } = await pool.query(
      `UPDATE verifications SET verification_status='verified',admin_approval_status='approved',
         admin_notes=$1,reviewed_at=NOW() WHERE worker_id=$2 RETURNING *`,[notes,workerId]
    );
    if (!rows.length) return res.status(404).json({ error:"Verification record not found" });
    await pool.query(
      "UPDATE workers SET verification_status='verified',admin_approval_status='approved',approved=true WHERE id=$1",[workerId]
    );
    res.json({ message:"Worker verified and approved",record:toJS(rows[0]) });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PATCH /api/verification/:workerId/reject */
router.patch("/:workerId/reject", requireRole("admin"), async (req, res) => {
  try {
    const workerId=parseInt(req.params.workerId);
    const { notes="" } = req.body;
    const { rows } = await pool.query(
      `UPDATE verifications SET verification_status='rejected',admin_approval_status='rejected',
         admin_notes=$1,reviewed_at=NOW() WHERE worker_id=$2 RETURNING *`,[notes,workerId]
    );
    if (!rows.length) return res.status(404).json({ error:"Verification record not found" });
    await pool.query(
      "UPDATE workers SET verification_status='rejected',admin_approval_status='rejected',approved=false WHERE id=$1",[workerId]
    );
    res.json({ message:"Worker verification rejected",record:toJS(rows[0]) });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* DELETE /api/verification/:workerId */
router.delete("/:workerId", requireRole("admin"), async (req, res) => {
  try {
    const workerId=parseInt(req.params.workerId);
    const { rows } = await pool.query("SELECT * FROM verifications WHERE worker_id=$1",[workerId]);
    if (!rows.length) return res.status(404).json({ error:"Verification record not found" });
    const record=rows[0];
    for (const filename of [record.certificate_file,record.work_video].filter(Boolean)) {
      try { const fp=path.join(UPLOAD_DIR,filename); if(fs.existsSync(fp))fs.unlinkSync(fp); } catch {}
    }
    await pool.query("DELETE FROM verifications WHERE worker_id=$1",[workerId]);
    await pool.query(
      "UPDATE workers SET verification_status='unverified',admin_approval_status='none',approved=false,verification_submitted_at=NULL WHERE id=$1",[workerId]
    );
    res.json({ message:"Verification record deleted successfully",workerId });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

module.exports = router;
