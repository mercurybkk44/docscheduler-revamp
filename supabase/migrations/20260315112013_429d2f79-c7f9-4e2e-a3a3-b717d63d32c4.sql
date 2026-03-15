
-- Create doctors table
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  weekday_quota INTEGER NOT NULL DEFAULT 4,
  weekend_quota INTEGER NOT NULL DEFAULT 2,
  color_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to doctors" ON public.doctors FOR ALL USING (true) WITH CHECK (true);

-- Create unavailable_dates table
CREATE TABLE public.unavailable_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, date)
);

ALTER TABLE public.unavailable_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to unavailable_dates" ON public.unavailable_dates FOR ALL USING (true) WITH CHECK (true);

-- Create preferred_dates table
CREATE TABLE public.preferred_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, date)
);

ALTER TABLE public.preferred_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to preferred_dates" ON public.preferred_dates FOR ALL USING (true) WITH CHECK (true);

-- Create holidays table
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  label TEXT DEFAULT 'HOLIDAY',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to holidays" ON public.holidays FOR ALL USING (true) WITH CHECK (true);

-- Create schedules table
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weekday', 'weekend')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date)
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to schedules" ON public.schedules FOR ALL USING (true) WITH CHECK (true);
