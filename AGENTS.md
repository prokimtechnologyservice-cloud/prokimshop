# Project Rules

- The game top-up system (Prokim City) is game-server facing through `/api/public/topup/get-pending-orders` and `/api/public/topup/mark-order-delivered`; both must keep checking the `TOPUP_API_KEY` secret on every call. Browser access to `topup_orders`/`topup_items` stays locked (no anon/authenticated grants) — all app access goes through the data gateway in `src/routes/api/public/data.ts`.
