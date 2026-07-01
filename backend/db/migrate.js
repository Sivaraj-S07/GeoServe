#!/usr/bin/env node
/**
 * db/migrate.js  — Run once to create schema + seed all JSON data into PostgreSQL
 * Usage: node db/migrate.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs   = require("fs");
const path = require("path");
const pool = require("./pool");

const DATA = path.join(__dirname, "../data");

function rj(file, fallback) {
  const fp = path.join(DATA, file);
  if (!fs.existsSync(fp)) return fallback;
  try { const r = fs.readFileSync(fp,"utf-8").trim(); return r ? JSON.parse(r) : fallback; }
  catch(e) { console.warn("  warn: cannot read",file,e.message); return fallback; }
}

async function run() {
  console.log("\n▶  GeoServe → PostgreSQL migration\n");
  const client = await pool.connect();
  try {
    // 1. Schema
    console.log("1. Creating schema …");
    const sql = fs.readFileSync(path.join(__dirname,"schema.sql"),"utf-8");
    await client.query(sql);
    console.log("   ✓ Schema OK\n");

    await client.query("BEGIN");

    // 2. Categories
    const cats = rj("categories.json",[]);
    console.log(`2. Categories (${cats.length}) …`);
    for (const c of cats) {
      await client.query(
        `INSERT INTO categories(id,name,icon,icon_type,banner_color,enabled,custom)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,icon=EXCLUDED.icon,
           icon_type=EXCLUDED.icon_type,banner_color=EXCLUDED.banner_color,
           enabled=EXCLUDED.enabled,custom=EXCLUDED.custom`,
        [c.id, c.name, c.icon||"cat-default", c.iconType||"preset", c.bannerColor||null, c.enabled!==false, !!c.custom]
      );
    }
    console.log("   ✓\n");

    // 3. Users
    const users = rj("users.json",[]);
    console.log(`3. Users (${users.length}) …`);
    for (const u of users) {
      await client.query(
        `INSERT INTO users(id,name,email,password,role,avatar,lat,lng,pincode,street,phone,
           referral_code,loyalty_points,last_seen_at,created_at,updated_at,name_en,name_ta)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,
           password=EXCLUDED.password,role=EXCLUDED.role,avatar=EXCLUDED.avatar,
           lat=EXCLUDED.lat,lng=EXCLUDED.lng,pincode=EXCLUDED.pincode,
           street=EXCLUDED.street,phone=EXCLUDED.phone,last_seen_at=EXCLUDED.last_seen_at,
           name_en=EXCLUDED.name_en,name_ta=EXCLUDED.name_ta`,
        [u.id,u.name,u.email.trim().toLowerCase(),u.password,u.role||"user",
         u.avatar||"",u.lat||0,u.lng||0,u.pincode||"",u.street||"",
         u.phone||"",u.referralCode||"",u.loyaltyPoints||0,
         u.lastSeenAt||null,u.createdAt||new Date().toISOString(),u.updatedAt||null,
         u.nameEn||u.name||"",u.nameTa||""]
      );
    }
    console.log("   ✓\n");

    // 4. Workers
    const workers = rj("workers.json",[]);
    console.log(`4. Workers (${workers.length}) …`);
    for (const w of workers) {
      await client.query(
        `INSERT INTO workers(id,user_id,name,email,category_id,phone,bio,specialization,
           experience,years_of_exp,skills,lat,lng,pincode,street,avatar,availability,
           approved,rating,jobs_completed,hourly_rate,payout_account,
           verification_status,admin_approval_status,verification_submitted_at,
           last_seen_at,created_at,updated_at,name_en,name_ta)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
                $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
         ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,email=EXCLUDED.email,
           category_id=EXCLUDED.category_id,phone=EXCLUDED.phone,bio=EXCLUDED.bio,
           specialization=EXCLUDED.specialization,lat=EXCLUDED.lat,lng=EXCLUDED.lng,
           pincode=EXCLUDED.pincode,street=EXCLUDED.street,avatar=EXCLUDED.avatar,
           availability=EXCLUDED.availability,approved=EXCLUDED.approved,
           rating=EXCLUDED.rating,jobs_completed=EXCLUDED.jobs_completed,
           hourly_rate=EXCLUDED.hourly_rate,payout_account=EXCLUDED.payout_account,
           verification_status=EXCLUDED.verification_status,
           admin_approval_status=EXCLUDED.admin_approval_status,
           last_seen_at=EXCLUDED.last_seen_at,
           name_en=EXCLUDED.name_en,name_ta=EXCLUDED.name_ta`,
        [w.id,w.userId,w.name,w.email||"",w.categoryId||null,w.phone||"",
         w.bio||"",w.specialization||"",w.experience||"",w.yearsOfExp||0,
         JSON.stringify(w.skills||[]),w.lat||0,w.lng||0,w.pincode||"",w.street||"",
         w.avatar||"",w.availability!==false,w.approved||false,
         w.rating||0,w.jobsCompleted||0,w.hourlyRate||500,
         JSON.stringify(w.payoutAccount||{}),
         w.verification_status||"unverified",w.admin_approval_status||"none",
         w.verification_submitted_at||null,w.lastSeenAt||null,
         w.createdAt||new Date().toISOString(),w.updatedAt||null,
         w.nameEn||w.name||"",w.nameTa||""]
      );
    }
    console.log("   ✓\n");

    // 5. Bookings
    const bookings = rj("bookings.json",[]);
    console.log(`5. Bookings (${bookings.length}) …`);
    for (const b of bookings) {
      await client.query(
        `INSERT INTO bookings(id,user_id,user_name,worker_id,worker_user_id,worker_name,
           category,date,notes,status,duration,hourly_rate,service_cost,distance_cost,
           distance_km,distance_rate,platform_fee,cost,worker_payout,admin_commission,
           admin_transaction_id,commission_status,split_details,payment_status,
           transaction_id,paid_at,user_lat,user_lng,user_phone,user_address,
           work_started_at,status_history,created_at,updated_at,
           user_name_en,user_name_ta,worker_name_en,worker_name_ta)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,
                $35,$36,$37,$38)
         ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,
           payment_status=EXCLUDED.payment_status,worker_payout=EXCLUDED.worker_payout,
           admin_commission=EXCLUDED.admin_commission,
           commission_status=EXCLUDED.commission_status,
           status_history=EXCLUDED.status_history,updated_at=EXCLUDED.updated_at`,
        [b.id,b.userId,b.userName||"",b.workerId,b.workerUserId||null,
         b.workerName||"",b.category||"",b.date,b.notes||"",b.status||"pending",
         b.duration||1,b.hourlyRate||0,b.serviceCost||0,b.distanceCost||0,
         b.distanceKm||0,b.distanceRate||0,b.platformFee||0,b.cost||0,
         b.workerPayout||0,b.adminCommission||0,b.adminTransactionId||null,
         b.commissionStatus||"pending",JSON.stringify(b.splitDetails||{}),
         b.paymentStatus||"unpaid",b.transactionId||null,b.paidAt||null,
         b.userLat||null,b.userLng||null,b.userPhone||"",b.userAddress||"",
         b.workStartedAt||null,JSON.stringify(b.statusHistory||[]),
         b.createdAt||new Date().toISOString(),b.updatedAt||new Date().toISOString(),
         b.userNameEn||b.userName||"",b.userNameTa||"",
         b.workerNameEn||b.workerName||"",b.workerNameTa||""]
      );
    }
    console.log("   ✓\n");

    // 6. Messages
    const msgs = rj("messages.json",[]);
    console.log(`6. Messages (${msgs.length}) …`);
    for (const m of msgs) {
      await client.query(
        `INSERT INTO messages(id,booking_id,sender_id,sender_name,sender_role,text,read,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING`,
        [m.id,m.bookingId,m.senderId,m.senderName||"",m.senderRole||"user",
         m.text,m.read||false,m.createdAt||new Date().toISOString()]
      );
    }
    console.log("   ✓\n");

    // 7. Verifications
    const verifs = rj("verifications.json",[]);
    console.log(`7. Verifications (${verifs.length}) …`);
    for (const v of verifs) {
      await client.query(
        `INSERT INTO verifications(id,worker_id,worker_name,worker_email,worker_phone,
           category_id,certificate_file,certificate_mimetype,certificate_originalname,
           work_video,video_mimetype,video_originalname,verification_status,
           admin_approval_status,admin_notes,reviewed_at,verification_submitted_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT(id) DO NOTHING`,
        [v.id,v.workerId,v.workerName||"",v.workerEmail||"",v.workerPhone||"",
         v.categoryId||null,v.certificate_file||null,v.certificate_mimetype||null,
         v.certificate_originalname||null,v.work_video||null,v.video_mimetype||null,
         v.video_originalname||null,v.verification_status||"pending",
         v.admin_approval_status||"pending",v.admin_notes||"",
         v.reviewed_at||null,v.verification_submitted_at||new Date().toISOString()]
      );
    }
    console.log("   ✓\n");

    // 8. Support messages
    const support = rj("supportMessages.json",{});
    let smCount = 0;
    console.log("8. Support messages …");
    for (const conv of Object.values(support)) {
      for (const m of (conv.messages||[])) {
        await client.query(
          `INSERT INTO support_messages(id,user_id,user_name,user_email,text,sender_role,
             sender_id,sender_name,read_by_admin,read_by_user,created_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(id) DO NOTHING`,
          [m.id,conv.userId,conv.userName||"",conv.userEmail||"",m.text,
           m.senderRole||"user",m.senderId||null,m.senderName||"",
           m.readByAdmin||false,m.readByUser!==false,
           m.createdAt||new Date().toISOString()]
        );
        smCount++;
      }
    }
    console.log(`   ✓ (${smCount} messages)\n`);

    // 9. Admin notifications
    const notifs = rj("adminNotifications.json",[]);
    console.log(`9. Admin notifications (${notifs.length}) …`);
    for (const n of notifs) {
      await client.query(
        `INSERT INTO admin_notifications(id,type,title,message,link,read,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING`,
        [n.id,n.type||"info",n.title||"",n.message||"",n.link||null,
         n.read||false,n.createdAt||new Date().toISOString()]
      );
    }
    console.log("   ✓\n");

    // 10. Admin wallet
    const w = rj("adminWallet.json",{balance:0,totalEarned:0,totalBookings:0,totalWithdrawn:0,transactions:[],payoutAccount:null});
    console.log("10. Admin wallet …");
    await client.query(
      `INSERT INTO admin_wallet(id,balance,total_earned,total_bookings,total_withdrawn,payout_account,updated_at)
       VALUES(1,$1,$2,$3,$4,$5,$6)
       ON CONFLICT(id) DO UPDATE SET balance=EXCLUDED.balance,total_earned=EXCLUDED.total_earned,
         total_bookings=EXCLUDED.total_bookings,total_withdrawn=EXCLUDED.total_withdrawn,
         payout_account=EXCLUDED.payout_account,updated_at=EXCLUDED.updated_at`,
      [w.balance||0,w.totalEarned||0,w.totalBookings||0,w.totalWithdrawn||0,
       w.payoutAccount?JSON.stringify(w.payoutAccount):null,w.updatedAt||null]
    );
    for (const t of (w.transactions||[])) {
      await client.query(
        `INSERT INTO wallet_transactions(id,type,booking_id,worker_id,worker_name,user_name,
           category,amount,worker_payout,service_cost,distance_cost,total_cost,
           commission_rate,status,mode,credited_to,note,created_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT(id) DO NOTHING`,
        [t.id,t.type||"commission",t.bookingId||null,t.workerId||null,
         t.workerName||"",t.userName||"",t.category||"",t.amount||0,
         t.workerPayout||0,t.serviceCost||0,t.distanceCost||0,t.totalCost||0,
         t.commissionRate||0.05,t.status||"credited",t.mode||"simulation",
         t.creditedTo?JSON.stringify(t.creditedTo):null,t.note||"",
         t.createdAt||new Date().toISOString()]
      );
    }
    console.log("   ✓\n");

    // 11. History
    const hist = rj("history.json",[]);
    console.log(`11. History (${hist.length}) …`);
    for (const h of hist) {
      await client.query(
        `INSERT INTO history(id,timestamp,type,actor_id,actor_name,actor_email,actor_role,
           booking_id,details,worker_name,category,date,cost,status)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT(id) DO NOTHING`,
        [h.id,h.timestamp||new Date().toISOString(),h.type||"",h.actorId||null,
         h.actorName||"",h.actorEmail||"",h.actorRole||"",h.bookingId||null,
         h.details||"",h.workerName||"",h.category||"",h.date||"",
         h.cost||null,h.status||""]
      );
    }
    console.log("   ✓\n");

    await client.query("COMMIT");
    console.log("✅  Migration complete!\n");
  } catch(err) {
    await client.query("ROLLBACK").catch(()=>{});
    console.error("❌  Migration FAILED:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
