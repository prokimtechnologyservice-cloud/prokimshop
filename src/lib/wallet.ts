export async function redeemVoucher(userId: string, voucher: string) {
  const res = await fetch("/api/public/redeem-voucher", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, voucher }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error ?? "redeem failed");
  return { amount: Number(j.amount), balance: Number(j.balance) };
}
