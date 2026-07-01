/**
 * services/imageStore.js
 *
 * Permanent image storage backed by PostgreSQL (Neon).
 *
 * Why: disk-based storage (multer.diskStorage / local "uploads" folders) does
 * NOT survive server restarts or redeployments on platforms like Render —
 * the filesystem is ephemeral. Every image uploaded anywhere in the app
 * (category icons, worker verification documents, etc.) must be saved as
 * BYTEA in PostgreSQL so it is available forever, across refreshes, logins,
 * restarts, and redeployments.
 */
"use strict";

const pool = require("../db/pool");

/**
 * Save an uploaded file buffer permanently in PostgreSQL.
 * @returns {Promise<number>} the new image id
 */
async function saveImage({ buffer, mimeType, originalName = "", ownerType = "", ownerId = "" }) {
  if (!buffer || !buffer.length) throw new Error("No file data to store");
  const { rows } = await pool.query(
    `INSERT INTO app_images(owner_type, owner_id, mime_type, original_name, size_bytes, data)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
    [ownerType, String(ownerId || ""), mimeType || "application/octet-stream", originalName, buffer.length, buffer]
  );
  return Number(rows[0].id);
}

/** Fetch an image row by id. Returns null if not found. */
async function getImage(id) {
  const numId = parseInt(id, 10);
  if (!Number.isFinite(numId)) return null;
  const { rows } = await pool.query(
    "SELECT id, owner_type, owner_id, mime_type, original_name, size_bytes, data, created_at FROM app_images WHERE id=$1",
    [numId]
  );
  return rows.length ? rows[0] : null;
}

/** Permanently delete an image row. Safe to call with an invalid/missing id. */
async function deleteImage(id) {
  const numId = parseInt(id, 10);
  if (!Number.isFinite(numId)) return false;
  const { rowCount } = await pool.query("DELETE FROM app_images WHERE id=$1", [numId]);
  return rowCount > 0;
}

module.exports = { saveImage, getImage, deleteImage };
