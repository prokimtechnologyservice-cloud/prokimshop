import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const ADMIN_MOBILE = "0960384928";

function getIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

// Accepts either a full gift.truemoney.com URL with ?v=CODE or a bare code
function extractVoucherCode(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const fromText = trimmed.match(/[?&]v=([A-Za-z0-9]+)/);
  if (fromText) return fromText[1];
  try {
    const u = new URL(trimmed);
    const v = u.searchParams.get("v");
    if (v) return v;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  } catch {
    // not a URL, treat as raw code
  }
  const bare = trimmed.match(/[A-Za-z0-9]{15,}/);
  if (bare) return bare[0];
  return /^[A-Za-z0-9]+$/.test(trimmed) ? trimmed : null;
}


export const Route = createFileRoute("/api/public/redeem-voucher")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            user_id: string;
            voucher: string;
          };
          if (!body?.user_id || !body?.voucher) {
            return Response.json({ error: "invalid" }, { status: 400 });
          }
          const code = extractVoucherCode(body.voucher);
          if (!code) {
            return Response.json({ error: "ลิงก์ซองไม่ถูกต้อง" }, { status: 400 });
          }

          const ip = getIp(request);
          const url = `https://gift.truemoney.com/campaign/vouchers/${encodeURIComponent(
            code,
          )}/redeem`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // TrueMoney sits behind Cloudflare and rejects bare server requests,
              // so send browser-like headers.
              "User-Agent":
                "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "th,en;q=0.9",
              Origin: "https://gift.truemoney.com",
              Referer: `https://gift.truemoney.com/campaign/?v=${encodeURIComponent(code)}`,
            },
            body: JSON.stringify({ mobile: ADMIN_MOBILE, voucher_hash: code }),
          });
          const raw = await res.text();
          let json: any = {};
          try {
            json = JSON.parse(raw);
          } catch {
            return Response.json(
              { error: "ระบบ TrueMoney ไม่ตอบกลับ กรุณาลองใหม่อีกครั้ง" },
              { status: 502 },
            );
          }
          const status = json?.status?.code;

          if (status !== "SUCCESS") {
            const msg =
              status === "VOUCHER_OUT_OF_STOCK"
                ? "ซองนี้ถูกใช้ไปแล้ว"
                : status === "TARGET_USER_NOT_FOUND"
                  ? "เบอร์ผู้รับไม่ถูกต้อง"
                  : status === "VOUCHER_NOT_FOUND"
                    ? "ไม่พบซองนี้ (ลิงก์อาจไม่ถูกต้องหรือหมดอายุ)"
                    : status === "VOUCHER_EXPIRED"
                      ? "ซองนี้หมดอายุแล้ว"
                      : status === "CANNOT_GET_OWN_VOUCHER"
                        ? "ไม่สามารถรับซองของตัวเองได้"
                        : json?.status?.message || "ไม่สามารถรับซองได้";
            return Response.json({ error: msg, code: status }, { status: 400 });
          }


          const amount =
            Number(json?.data?.my_ticket?.amount_baht) ||
            Number(json?.data?.voucher?.amount_baht) ||
            Number(json?.data?.voucher?.redeemed_amount_baht) ||
            0;
          if (!amount || amount <= 0) {
            return Response.json({ error: "ไม่สามารถอ่านยอดเงินซองได้" }, { status: 400 });
          }

          const admin = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          );
          const { data: newBal, error } = await admin.rpc("topup_balance", {
            _user_id: body.user_id,
            _amount: amount,
            _voucher: code,
            _ip: ip,
          });
          if (error) throw error;

          return Response.json({ amount, balance: Number(newBal) });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "server error" }, { status: 500 });
        }
      },
    },
  },
});
