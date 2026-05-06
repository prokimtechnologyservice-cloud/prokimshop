CREATE POLICY "public insert staff" ON public.staff FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public update staff" ON public.staff FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "public delete staff" ON public.staff FOR DELETE TO public USING (true);