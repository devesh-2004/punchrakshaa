import { rows, one, withTransaction } from "@/lib/db/postgres";
import { date, type Lean } from "./_mappers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v: unknown): string | null => (typeof v === "string" && UUID_RE.test(v) ? v : null);

export type AddressDoc = {
  _id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export type UserDoc = Lean<{
  name: string;
  email: string;
  phone: string;
  role: string;
  addresses: AddressDoc[];
  otpHash?: string;
  otpExpiresAt?: Date;
}>;

function rowToAddress(row: Record<string, any>): AddressDoc {
  return {
    _id: row.id,
    label: row.label,
    fullName: row.full_name,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    isDefault: row.is_default,
  };
}

function rowToUser(row: Record<string, any>, addresses: AddressDoc[] = [], opts: { safe?: boolean } = {}): UserDoc {
  const user: UserDoc = {
    _id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    addresses,
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
  if (!opts.safe) {
    user.otpHash = row.otp_hash;
    user.otpExpiresAt = date(row.otp_expires_at);
  }
  return user;
}

async function fetchAddresses(userId: string): Promise<AddressDoc[]> {
  const r = await rows(
    `SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
    [userId],
  );
  return r.map(rowToAddress);
}

export async function findById(id: string, opts: { safe?: boolean } = {}): Promise<UserDoc | null> {
  const uid = asUuid(id);
  if (!uid) return null;
  const row = await one(`SELECT * FROM users WHERE id = $1`, [uid]);
  if (!row) return null;
  return rowToUser(row, await fetchAddresses(uid), opts);
}

/** Find a user by phone, optionally excluding a given user id (for uniqueness checks). */
export async function findByPhone(phone: string, excludeId?: string): Promise<UserDoc | null> {
  const exclude = excludeId ? asUuid(excludeId) : null;
  const row = exclude
    ? await one(`SELECT * FROM users WHERE phone = $1 AND id <> $2`, [phone, exclude])
    : await one(`SELECT * FROM users WHERE phone = $1`, [phone]);
  return row ? rowToUser(row, []) : null;
}

/** Find-or-create a user by phone (mirrors the old findOneAndUpdate upsert). */
export async function upsertByPhone(phone: string): Promise<UserDoc> {
  const row = await one(
    `INSERT INTO users (phone) VALUES ($1)
     ON CONFLICT (phone) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [phone],
  );
  return rowToUser(row!, []);
}

export async function updateById(
  id: string,
  patch: Partial<{ name: string; email: string; phone: string }>,
  opts: { safe?: boolean } = {},
): Promise<UserDoc | null> {
  const uid = asUuid(id);
  if (!uid) return null;
  const map: Record<string, string> = { name: "name", email: "email", phone: "phone" };
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (!map[k] || v === undefined) continue;
    params.push(v);
    sets.push(`${map[k]} = $${params.length}`);
  }
  if (!sets.length) return findById(uid, opts);
  sets.push("updated_at = now()");
  params.push(uid);
  const row = await one(`UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`, params);
  if (!row) return null;
  return rowToUser(row, await fetchAddresses(uid), opts);
}

// --- Address sub-operations (replace Mongoose addresses subdoc mutations) ---

export async function getAddresses(userId: string): Promise<AddressDoc[]> {
  const uid = asUuid(userId);
  if (!uid) return [];
  return fetchAddresses(uid);
}

export async function addAddress(
  userId: string,
  addr: Omit<AddressDoc, "_id" | "isDefault"> & { isDefault?: boolean },
): Promise<AddressDoc[]> {
  if (!asUuid(userId)) return [];
  return withTransaction(async (client) => {
    const countRes = await client.query(`SELECT count(*)::int AS n FROM user_addresses WHERE user_id = $1`, [userId]);
    const makeDefault = addr.isDefault || countRes.rows[0].n === 0;
    if (makeDefault) {
      await client.query(`UPDATE user_addresses SET is_default = false WHERE user_id = $1`, [userId]);
    }
    await client.query(
      `INSERT INTO user_addresses
         (user_id, label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        userId, addr.label, addr.fullName, addr.phone, addr.addressLine1,
        addr.addressLine2 ?? "", addr.city, addr.state, addr.pincode, makeDefault,
      ],
    );
    const r = await client.query(
      `SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [userId],
    );
    return r.rows.map(rowToAddress);
  });
}

export async function updateAddress(
  userId: string,
  addrId: string,
  addr: Omit<AddressDoc, "_id" | "isDefault"> & { isDefault?: boolean },
): Promise<AddressDoc[] | null> {
  if (!asUuid(userId) || !asUuid(addrId)) return null;
  return withTransaction(async (client) => {
    const exists = await client.query(`SELECT 1 FROM user_addresses WHERE id = $1 AND user_id = $2`, [addrId, userId]);
    if (!exists.rowCount) return null;
    if (addr.isDefault) {
      await client.query(`UPDATE user_addresses SET is_default = false WHERE user_id = $1`, [userId]);
    }
    await client.query(
      `UPDATE user_addresses SET
         label=$1, full_name=$2, phone=$3, address_line1=$4, address_line2=$5,
         city=$6, state=$7, pincode=$8, is_default=$9, updated_at=now()
       WHERE id=$10 AND user_id=$11`,
      [
        addr.label, addr.fullName, addr.phone, addr.addressLine1, addr.addressLine2 ?? "",
        addr.city, addr.state, addr.pincode, addr.isDefault ?? false, addrId, userId,
      ],
    );
    const r = await client.query(
      `SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [userId],
    );
    return r.rows.map(rowToAddress);
  });
}

export async function setDefaultAddress(userId: string, addrId: string): Promise<AddressDoc[] | null> {
  if (!asUuid(userId) || !asUuid(addrId)) return null;
  return withTransaction(async (client) => {
    const exists = await client.query(`SELECT 1 FROM user_addresses WHERE id = $1 AND user_id = $2`, [addrId, userId]);
    if (!exists.rowCount) return null;
    await client.query(
      `UPDATE user_addresses SET is_default = (id = $1), updated_at = now() WHERE user_id = $2`,
      [addrId, userId],
    );
    const r = await client.query(
      `SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [userId],
    );
    return r.rows.map(rowToAddress);
  });
}

export async function deleteAddress(userId: string, addrId: string): Promise<AddressDoc[] | null> {
  if (!asUuid(userId) || !asUuid(addrId)) return null;
  return withTransaction(async (client) => {
    const del = await client.query(
      `DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING is_default`,
      [addrId, userId],
    );
    if (!del.rowCount) return null;
    // If we removed the default, promote the oldest remaining address.
    const remaining = await client.query(
      `SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    );
    if (remaining.rowCount && !remaining.rows.some((a: Record<string, unknown>) => a.is_default)) {
      await client.query(`UPDATE user_addresses SET is_default = true WHERE id = $1`, [remaining.rows[0].id]);
      remaining.rows[0].is_default = true;
    }
    return remaining.rows
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => Number(b.is_default) - Number(a.is_default))
      .map(rowToAddress);
  });
}
