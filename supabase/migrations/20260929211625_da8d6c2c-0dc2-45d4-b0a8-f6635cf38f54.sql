CREATE OR REPLACE FUNCTION public.is_hospital_member(_hospital_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::user_role) OR EXISTS (
    SELECT 1 FROM public.holarchelp_hospital_members m
    WHERE m.hospital_id = _hospital_id AND m.user_id = auth.uid());
$$;

DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['stock_requisitions','budget_actuals','demand_forecasts','procedure_kits','procedure_kit_items','stock_count_reconciliation','procedure_stock_usage','department_budgets','patient_invoices','patient_invoice_lines','vendor_invoices','purchase_orders','purchase_order_lines','suppliers','goods_received','stock_items','stock_levels'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname LIKE 'authenticated_can_%' LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Tables with hospital_id
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['stock_requisitions','demand_forecasts','procedure_kits','stock_count_reconciliation','department_budgets','purchase_orders','stock_items','stock_levels'] LOOP
    EXECUTE format('CREATE POLICY "hospital_members_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_hospital_member(hospital_id))', t);
    EXECUTE format('CREATE POLICY "hospital_members_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_hospital_member(hospital_id))', t);
    EXECUTE format('CREATE POLICY "hospital_members_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_hospital_member(hospital_id)) WITH CHECK (public.is_hospital_member(hospital_id))', t);
  END LOOP;
END $$;

-- patient_invoices: hospital members, plus the client can view their own
CREATE POLICY "hospital_members_select_patient_invoices" ON public.patient_invoices FOR SELECT TO authenticated
  USING (public.is_hospital_member(hospital_id) OR public.can_view_patient_record(patient_id));
CREATE POLICY "hospital_members_insert_patient_invoices" ON public.patient_invoices FOR INSERT TO authenticated WITH CHECK (public.is_hospital_member(hospital_id));
CREATE POLICY "hospital_members_update_patient_invoices" ON public.patient_invoices FOR UPDATE TO authenticated USING (public.is_hospital_member(hospital_id)) WITH CHECK (public.is_hospital_member(hospital_id));

CREATE POLICY "scoped_select_patient_invoice_lines" ON public.patient_invoice_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patient_invoices i WHERE i.id = invoice_id AND (public.is_hospital_member(i.hospital_id) OR public.can_view_patient_record(i.patient_id))));
CREATE POLICY "scoped_insert_patient_invoice_lines" ON public.patient_invoice_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.patient_invoices i WHERE i.id = invoice_id AND public.is_hospital_member(i.hospital_id)));

CREATE POLICY "scoped_select_budget_actuals" ON public.budget_actuals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.department_budgets b WHERE b.id = department_budget_id AND public.is_hospital_member(b.hospital_id)));
CREATE POLICY "scoped_insert_budget_actuals" ON public.budget_actuals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.department_budgets b WHERE b.id = department_budget_id AND public.is_hospital_member(b.hospital_id)));

CREATE POLICY "scoped_select_procedure_kit_items" ON public.procedure_kit_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.procedure_kits k WHERE k.id = kit_id AND public.is_hospital_member(k.hospital_id)));
CREATE POLICY "scoped_insert_procedure_kit_items" ON public.procedure_kit_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.procedure_kits k WHERE k.id = kit_id AND public.is_hospital_member(k.hospital_id)));
CREATE POLICY "scoped_delete_procedure_kit_items" ON public.procedure_kit_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.procedure_kits k WHERE k.id = kit_id AND public.is_hospital_member(k.hospital_id)));

CREATE POLICY "scoped_select_procedure_stock_usage" ON public.procedure_stock_usage FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stock_items s WHERE s.id = stock_item_id AND public.is_hospital_member(s.hospital_id)));
CREATE POLICY "scoped_insert_procedure_stock_usage" ON public.procedure_stock_usage FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stock_items s WHERE s.id = stock_item_id AND public.is_hospital_member(s.hospital_id)));
CREATE POLICY "scoped_update_procedure_stock_usage" ON public.procedure_stock_usage FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stock_items s WHERE s.id = stock_item_id AND public.is_hospital_member(s.hospital_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stock_items s WHERE s.id = stock_item_id AND public.is_hospital_member(s.hospital_id)));

CREATE POLICY "scoped_select_purchase_order_lines" ON public.purchase_order_lines FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND public.is_hospital_member(o.hospital_id)));
CREATE POLICY "scoped_insert_purchase_order_lines" ON public.purchase_order_lines FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND public.is_hospital_member(o.hospital_id)));
CREATE POLICY "scoped_update_purchase_order_lines" ON public.purchase_order_lines FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND public.is_hospital_member(o.hospital_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND public.is_hospital_member(o.hospital_id)));

CREATE POLICY "scoped_select_goods_received" ON public.goods_received FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND public.is_hospital_member(o.hospital_id)));
CREATE POLICY "scoped_insert_goods_received" ON public.goods_received FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND public.is_hospital_member(o.hospital_id)));

CREATE POLICY "scoped_select_vendor_invoices" ON public.vendor_invoices FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND public.is_hospital_member(o.hospital_id)));
CREATE POLICY "scoped_insert_vendor_invoices" ON public.vendor_invoices FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND public.is_hospital_member(o.hospital_id)));
CREATE POLICY "scoped_update_vendor_invoices" ON public.vendor_invoices FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND public.is_hospital_member(o.hospital_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders o WHERE o.id = purchase_order_id AND public.is_hospital_member(o.hospital_id)));

-- suppliers: staff can read; admins/hospital staff manage
CREATE POLICY "staff_select_suppliers" ON public.suppliers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::user_role) OR EXISTS (SELECT 1 FROM public.holarchelp_hospital_members m WHERE m.user_id = auth.uid()));
CREATE POLICY "staff_insert_suppliers" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::user_role) OR EXISTS (SELECT 1 FROM public.holarchelp_hospital_members m WHERE m.user_id = auth.uid()));
CREATE POLICY "staff_update_suppliers" ON public.suppliers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::user_role) OR EXISTS (SELECT 1 FROM public.holarchelp_hospital_members m WHERE m.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::user_role) OR EXISTS (SELECT 1 FROM public.holarchelp_hospital_members m WHERE m.user_id = auth.uid()));

-- User decisions: admins only
DROP POLICY IF EXISTS "Signed-in users can read maeve processes" ON public.ask_maeve_processes;
CREATE POLICY "Admins can read maeve processes" ON public.ask_maeve_processes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::user_role));
DROP POLICY IF EXISTS "Anyone authenticated can read guardian voice settings" ON public.holarchelp_voice_clip_settings;
CREATE POLICY "Admins can read guardian voice settings" ON public.holarchelp_voice_clip_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::user_role));
DROP POLICY IF EXISTS "Anyone authenticated can read modules" ON public.app_modules;
CREATE POLICY "Admins can read modules" ON public.app_modules FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::user_role));