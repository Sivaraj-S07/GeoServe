/**
 * routes/support.js — PostgreSQL version
 */
const express = require("express");
const router  = express.Router();
const pool    = require("../db/pool");
const { verifyToken }  = require("../middleware/auth");
const { requireRole }  = require("../middleware/role");

/* GET /api/support/messages — user's own conversation */
router.get("/messages", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM support_messages WHERE user_id=$1 ORDER BY created_at ASC",[req.user.id]
    );
    // Mark admin replies as read by user
    await pool.query(
      "UPDATE support_messages SET read_by_user=true WHERE user_id=$1 AND sender_role='admin' AND read_by_user=false",
      [req.user.id]
    );
    res.json({ messages:rows.map(m=>({
      id:m.id,text:m.text,senderRole:m.sender_role,senderId:m.sender_id?Number(m.sender_id):null,
      senderName:m.sender_name,readByAdmin:m.read_by_admin,readByUser:m.read_by_user,createdAt:m.created_at,
    }))});
  } catch(err) {
    console.error("[support/messages]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* POST /api/support/messages — user sends message */
router.post("/messages", verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text||!text.trim()) return res.status(400).json({ error:"Message text is required" });
    if (typeof text!=="string"||text.trim().length>2000) return res.status(400).json({ error:"Message must be 1-2000 characters" });
    const id=`sup_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const { rows } = await pool.query(
      `INSERT INTO support_messages(id,user_id,user_name,user_email,text,sender_role,sender_id,
         sender_name,read_by_admin,read_by_user,created_at)
       VALUES($1,$2,$3,$4,$5,'user',$6,$7,false,true,NOW()) RETURNING *`,
      [id,req.user.id,req.user.name,req.user.email,text.trim().slice(0,2000),
       req.user.id,req.user.name]
    );
    const msg={ id:rows[0].id,text:rows[0].text,senderRole:"user",senderId:req.user.id,
      senderName:req.user.name,readByAdmin:false,readByUser:true,createdAt:rows[0].created_at };

    if (req.app.locals.addAdminNotification) req.app.locals.addAdminNotification({
      type:"support_message",title:"New Support Message",
      message:`${req.user.name||"A user"}: ${msg.text.slice(0,80)}${msg.text.length>80?"…":""}`,link:"/support",
    });
    if (req.app.locals.pushAdminNotification) req.app.locals.pushAdminNotification({type:"support_message",message:msg});
    res.status(201).json({ message:msg });
  } catch(err) {
    console.error("[support/messages post]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* GET /api/support/conversations — admin
 * OPTIMIZED: single query with DISTINCT ON to get last message text — eliminates N+1.
 */
router.get("/conversations", verifyToken, requireRole("admin"), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         sm.user_id, sm.user_name, sm.user_email,
         MAX(sm.created_at)                                                        AS last_message_at,
         COUNT(*) FILTER(WHERE sm.sender_role='user' AND sm.read_by_admin=false)   AS unread,
         COUNT(*)                                                                   AS total,
         -- last message text via subquery (avoids N+1 Promise.all loop)
         (SELECT text FROM support_messages s2
          WHERE s2.user_id = sm.user_id
          ORDER BY s2.created_at DESC LIMIT 1)                                     AS last_message
       FROM support_messages sm
       GROUP BY sm.user_id, sm.user_name, sm.user_email
       ORDER BY last_message_at DESC`
    );
    const list = rows.map(r => ({
      userId:        Number(r.user_id),
      userName:      r.user_name,
      userEmail:     r.user_email,
      lastMessage:   r.last_message || "",
      lastMessageAt: r.last_message_at,
      unreadByAdmin: Number(r.unread),
      totalMessages: Number(r.total),
    }));
    res.json({ conversations: list, total: list.length });
  } catch (err) {
    console.error("[support/conversations]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* GET /api/support/conversations/:userId — admin */
router.get("/conversations/:userId", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const uid=parseInt(req.params.userId);
    const { rows } = await pool.query(
      "SELECT * FROM support_messages WHERE user_id=$1 ORDER BY created_at ASC",[uid]
    );
    const user=rows[0]||null;
    res.json({
      messages:rows.map(m=>({id:m.id,text:m.text,senderRole:m.sender_role,senderId:m.sender_id?Number(m.sender_id):null,senderName:m.sender_name,readByAdmin:m.read_by_admin,readByUser:m.read_by_user,createdAt:m.created_at})),
      userId:uid,userName:user?.user_name||"",userEmail:user?.user_email||"",
    });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

/* POST /api/support/reply/:userId — admin reply */
router.post("/reply/:userId", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const uid=parseInt(req.params.userId);
    const { text } = req.body;
    if (!text||!text.trim()) return res.status(400).json({ error:"Reply text is required" });
    const { rows:exists } = await pool.query("SELECT id FROM support_messages WHERE user_id=$1 LIMIT 1",[uid]);
    if (!exists.length) return res.status(404).json({ error:"Conversation not found" });
    const id=`sup_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const { rows } = await pool.query(
      `INSERT INTO support_messages(id,user_id,user_name,user_email,text,sender_role,sender_id,
         sender_name,read_by_admin,read_by_user,created_at)
       SELECT $1,user_id,user_name,user_email,$2,'admin',$3,'Support Team',true,false,NOW()
       FROM support_messages WHERE user_id=$4 LIMIT 1 RETURNING *`,
      [id,text.trim().slice(0,2000),req.user.id,uid]
    );
    const m=rows[0];
    res.status(201).json({ message:{id:m.id,text:m.text,senderRole:"admin",senderId:req.user.id,senderName:"Support Team",readByAdmin:true,readByUser:false,createdAt:m.created_at} });
  } catch(err) {
    console.error("[support/reply]",err.message);
    res.status(500).json({ error:"Internal server error" });
  }
});

/* PATCH /api/support/read/:userId — admin marks read */
router.patch("/read/:userId", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    await pool.query(
      "UPDATE support_messages SET read_by_admin=true WHERE user_id=$1 AND sender_role='user' AND read_by_admin=false",
      [parseInt(req.params.userId)]
    );
    res.json({ ok:true });
  } catch(err) {
    res.status(500).json({ error:"Internal server error" });
  }
});

module.exports = router;
