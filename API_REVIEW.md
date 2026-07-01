# GeoServe — Full API Structure Review
_Last verified: v5.3 — Three-Component Cost Model_

---

## Authentication (`/api/auth`)
| Method | Endpoint              | Auth     | Description                        |
|--------|-----------------------|----------|------------------------------------|
| POST   | `/api/auth/signup`    | Public   | Register user/worker               |
| POST   | `/api/auth/login`     | Public   | Login, returns JWT                 |
| GET    | `/api/auth/me`        | JWT      | Get current user profile           |
| POST   | `/api/auth/change-password` | JWT | Change password                  |

---

## Users (`/api/users`)
| Method | Endpoint              | Auth     | Description                        |
|--------|-----------------------|----------|------------------------------------|
| GET    | `/api/users`          | Admin    | List all users                     |
| GET    | `/api/users/:id`      | Admin    | Get user by ID                     |
| PUT    | `/api/users/:id`      | JWT      | Update user profile                |
| DELETE | `/api/users/:id`      | Admin    | Delete user                        |

---

## Workers (`/api/workers`)
| Method | Endpoint                          | Auth   | Description                  |
|--------|-----------------------------------|--------|------------------------------|
| GET    | `/api/workers`                    | Public | List all workers             |
| GET    | `/api/workers/my`                 | Worker | Get own worker profile       |
| GET    | `/api/workers/:id`                | Public | Get worker by ID             |
| GET    | `/api/workers/:id/payment-info`   | JWT    | Get worker payout account    |
| POST   | `/api/workers`                    | JWT    | Create worker profile        |
| PUT    | `/api/workers/:id`                | Worker | Update own profile           |
| PATCH  | `/api/workers/:id/availability`   | Worker | Toggle online/offline        |
| PATCH  | `/api/workers/:id/approve`        | Admin  | Approve worker               |
| PATCH  | `/api/workers/:id/payout-account` | Worker | Update bank/UPI details      |
| DELETE | `/api/workers/:id`                | Admin  | Delete worker                |
| GET    | `/api/workers/online-activity`    | Admin  | Worker activity log          |

---

## Bookings (`/api/bookings`) ★ Updated v5.3
| Method | Endpoint                     | Auth   | Description                          |
|--------|------------------------------|--------|--------------------------------------|
| GET    | `/api/bookings`              | JWT    | List bookings (role-filtered)        |
| POST   | `/api/bookings`              | User   | Create booking with 3-component cost |
| PATCH  | `/api/bookings/:id/status`   | Worker | Update booking status                |
| POST   | `/api/bookings/:id/confirm`  | User   | Confirm + trigger split payment      |
| GET    | `/api/bookings/:id/history`  | JWT    | Get booking status history           |
| DELETE | `/api/bookings/:id`          | Worker/Admin | **Worker or Admin only**       |

### Three-Component Cost Model
```
POST /api/bookings body:
  serviceCost   — ₹ booking cost (hourlyRate × hours)         [component 1]
  distanceCost  — ₹ petrol/travel reimbursement (₹12/km)      [component 2]
  platformFee   — ₹ 5% of serviceCost                         [component 3]
  cost          — total = serviceCost + distanceCost + platformFee

On confirm:
  workerPayout    = serviceCost + distanceCost  (worker keeps travel money)
  adminCommission = platformFee                 (platform 5%)
```

### Delete Permission Matrix
| Role   | Can Delete?                          |
|--------|--------------------------------------|
| User   | ❌ **BLOCKED** — 403 Forbidden       |
| Worker | ✅ Only their own bookings            |
| Admin  | ✅ Any booking                        |

---

## Commission / Admin Wallet (`/api/commission`)
| Method | Endpoint                              | Auth  | Description                    |
|--------|---------------------------------------|-------|--------------------------------|
| GET    | `/api/commission/wallet`              | Admin | Wallet balance + stats         |
| GET    | `/api/commission/transactions`        | Admin | Full transaction ledger        |
| GET    | `/api/commission/transactions/:id`    | Admin | Single transaction detail      |
| GET    | `/api/commission/stats`               | Admin | Aggregated analytics           |
| GET    | `/api/commission/payout-account`      | Admin | Get configured payout account  |
| POST   | `/api/commission/withdraw`            | Admin | Record a withdrawal            |
| GET    | `/api/commission/download`            | Admin | CSV export of transactions     |
| GET    | `/api/commission/summary`             | Admin | Period summary                 |

---

## Categories (`/api/categories`)
| Method | Endpoint               | Auth   | Description            |
|--------|------------------------|--------|------------------------|
| GET    | `/api/categories`      | Public | List all categories    |
| POST   | `/api/categories`      | Admin  | Create category        |
| PUT    | `/api/categories/:id`  | Admin  | Update category        |
| DELETE | `/api/categories/:id`  | Admin  | Delete category        |

---

## Messages (`/api/messages`)
| Method | Endpoint                         | Auth | Description                     |
|--------|----------------------------------|------|---------------------------------|
| GET    | `/api/messages/:bookingId`       | JWT  | Get messages for booking        |
| POST   | `/api/messages/:bookingId`       | JWT  | Send message                    |
| PATCH  | `/api/messages/:bookingId/read`  | JWT  | Mark messages as read           |
| GET    | `/api/messages/:bookingId/unread`| JWT  | Get unread count                |
| GET    | `/api/messages/conversations`    | JWT  | Get all conversations           |

---

## Pincode (`/api/pincode`)
| Method | Endpoint                        | Auth   | Description                  |
|--------|---------------------------------|--------|------------------------------|
| GET    | `/api/pincode/:pincode`         | Public | Look up pincode area         |
| GET    | `/api/pincode/:pincode/workers` | Public | Find workers in pincode area |
| POST   | `/api/pincode/validate`         | Public | Validate a pincode           |

---

## Verification (`/api/verification`)
| Method | Endpoint                            | Auth   | Description              |
|--------|-------------------------------------|--------|--------------------------|
| GET    | `/api/verification/my`              | Worker | Own verification status  |
| POST   | `/api/verification`                 | Worker | Submit verification docs |
| GET    | `/api/verification/all`             | Admin  | All pending verifications|
| PATCH  | `/api/verification/:workerId/approve` | Admin | Approve worker         |
| PATCH  | `/api/verification/:workerId/reject`  | Admin | Reject worker          |
| GET    | `/api/verification/stats`           | Admin  | Verification analytics   |

---

## History (`/api/history`)
| Method | Endpoint              | Auth  | Description             |
|--------|-----------------------|-------|-------------------------|
| GET    | `/api/history`        | Admin | Full audit history      |
| GET    | `/api/history/stats`  | Admin | History analytics       |

---

## Support (`/api/support` — admin messaging)
| Method | Endpoint                          | Auth  | Description               |
|--------|-----------------------------------|-------|---------------------------|
| GET    | `/api/support/messages`           | Admin | All support tickets       |
| POST   | `/api/support/messages`           | JWT   | Submit support ticket     |
| POST   | `/api/support/reply/:userId`      | Admin | Reply to ticket           |
| GET    | `/api/support/conversations`      | Admin | All user conversations    |
| GET    | `/api/support/conversations/:userId` | Admin | Specific user thread   |
| PATCH  | `/api/support/read/:userId`       | Admin | Mark thread as read       |

---

## Health
| Method | Endpoint      | Auth   | Description        |
|--------|---------------|--------|--------------------|
| GET    | `/api/ping`   | Public | Server health check|

---

## Summary
- **Total endpoints: 52**
- **Auth protected: 48** (JWT or role-based)
- **Public: 4** (signup, login, ping, categories/pincode reads)
- **New in v5.3**: distanceCost field, worker-only delete, 3-component split
