-- announcements: public read only
DROP POLICY IF EXISTS "Public full access announcements" ON public.announcements;
DROP POLICY IF EXISTS "public manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "announcements_public_all" ON public.announcements;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies WHERE schemaname='public'
    AND tablename IN ('announcements','countdowns','promotions','site_content','site_overlays','site_popups','mystery_box_items','auction_bids','visits')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- read-only public access for content tables
CREATE POLICY "public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "public read countdowns" ON public.countdowns FOR SELECT USING (true);
CREATE POLICY "public read promotions" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "public read site_content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "public read site_overlays" ON public.site_overlays FOR SELECT USING (true);
CREATE POLICY "public read site_popups" ON public.site_popups FOR SELECT USING (true);
CREATE POLICY "public read mystery_box_items" ON public.mystery_box_items FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.announcements, public.countdowns, public.promotions,
  public.site_content, public.site_overlays, public.site_popups, public.mystery_box_items
  FROM anon, authenticated;
GRANT SELECT ON public.announcements, public.countdowns, public.promotions,
  public.site_content, public.site_overlays, public.site_popups, public.mystery_box_items
  TO anon, authenticated;

-- auction_bids: server-only reads (leaderboard served through /api/public/auction)
REVOKE ALL ON public.auction_bids FROM anon, authenticated;
GRANT ALL ON public.auction_bids TO service_role;

-- visits: anonymous tracking may still insert, but nobody may read from the browser
REVOKE ALL ON public.visits FROM anon, authenticated;
GRANT INSERT ON public.visits TO anon, authenticated;
GRANT ALL ON public.visits TO service_role;
CREATE POLICY "public insert visits" ON public.visits FOR INSERT WITH CHECK (true);

GRANT ALL ON public.announcements, public.countdowns, public.promotions,
  public.site_content, public.site_overlays, public.site_popups, public.mystery_box_items
  TO service_role;