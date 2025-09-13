--
-- PostgreSQL database dump
--

\restrict tD60t2QPRfNJdpq4lfFvcEhE25btZ9SUfV54NOpdMX4DhDehADxMDtjoSO83Z4l

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: check_low_stock(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_low_stock() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if stock is below reorder level
    IF NEW.current_stock <= NEW.reorder_level THEN
        INSERT INTO stock_alerts (stock_item_id, alert_type, current_stock, threshold_value, message)
        VALUES (
            NEW.id,
            'LOW_STOCK',
            NEW.current_stock,
            NEW.reorder_level,
            'Stock level for ' || NEW.name || ' is below reorder level (' || NEW.reorder_level || ')'
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_low_stock() OWNER TO postgres;

--
-- Name: update_notifications_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_notifications_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_notifications_updated_at() OWNER TO postgres;

--
-- Name: update_patient_assignments_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_patient_assignments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_patient_assignments_updated_at() OWNER TO postgres;

--
-- Name: update_stock_levels(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_stock_levels() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update current stock based on movement type
    IF NEW.movement_type = 'IN' THEN
        UPDATE stock_items 
        SET current_stock = current_stock + NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.stock_item_id;
    ELSIF NEW.movement_type = 'OUT' THEN
        UPDATE stock_items 
        SET current_stock = current_stock - NEW.quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.stock_item_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_stock_levels() OWNER TO postgres;

--
-- Name: update_stock_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_stock_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_stock_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: update_user_presence_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_user_presence_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_user_presence_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts_receivable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts_receivable (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    patient_id uuid,
    op_number character varying(20),
    original_amount numeric(10,2) NOT NULL,
    remaining_amount numeric(10,2) NOT NULL,
    due_date date NOT NULL,
    aging_bucket character varying(10) NOT NULL,
    status character varying(20) DEFAULT 'CURRENT'::character varying,
    last_reminder_sent timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT accounts_receivable_aging_bucket_check CHECK (((aging_bucket)::text = ANY ((ARRAY['0-30'::character varying, '31-60'::character varying, '61-90'::character varying, '90+'::character varying])::text[]))),
    CONSTRAINT accounts_receivable_status_check CHECK (((status)::text = ANY ((ARRAY['CURRENT'::character varying, 'OVERDUE'::character varying, 'SETTLED'::character varying])::text[])))
);


ALTER TABLE public.accounts_receivable OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    username character varying(50) NOT NULL,
    action character varying(100) NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id character varying(100),
    op_number character varying(20),
    details jsonb NOT NULL,
    ip_address inet,
    user_agent text,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    checksum character varying(64) NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: cash_reconciliations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_reconciliations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    shift_date date NOT NULL,
    opening_float numeric(10,2) NOT NULL,
    expected_cash numeric(10,2) NOT NULL,
    actual_cash numeric(10,2) NOT NULL,
    variance numeric(10,2) NOT NULL,
    notes text,
    reconciled_by uuid NOT NULL,
    reconciled_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cash_reconciliations OWNER TO postgres;

--
-- Name: clinical_diagnosis_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinical_diagnosis_codes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(20) NOT NULL,
    description text NOT NULL,
    category character varying(100),
    subcategory character varying(100),
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    search_keywords text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clinical_diagnosis_codes OWNER TO postgres;

--
-- Name: clinical_lab_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinical_lab_tests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    test_code character varying(50) NOT NULL,
    test_name character varying(200) NOT NULL,
    test_category character varying(100),
    specimen_type character varying(100),
    turnaround_time character varying(50),
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    search_keywords text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clinical_lab_tests OWNER TO postgres;

--
-- Name: clinical_medications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinical_medications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(200) NOT NULL,
    generic_name character varying(200),
    dosage_form character varying(50),
    strength character varying(50),
    manufacturer character varying(100),
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    search_keywords text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clinical_medications OWNER TO postgres;

--
-- Name: clinical_procedures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinical_procedures (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    procedure_code character varying(50) NOT NULL,
    procedure_name character varying(200) NOT NULL,
    procedure_category character varying(100),
    complexity character varying(20),
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    search_keywords text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clinical_procedures_complexity_check CHECK (((complexity)::text = ANY ((ARRAY['SIMPLE'::character varying, 'MODERATE'::character varying, 'COMPLEX'::character varying])::text[])))
);


ALTER TABLE public.clinical_procedures OWNER TO postgres;

--
-- Name: clinical_symptoms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinical_symptoms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    symptom_name character varying(200) NOT NULL,
    symptom_category character varying(100),
    severity_level character varying(20),
    is_active boolean DEFAULT true,
    usage_count integer DEFAULT 0,
    search_keywords text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT clinical_symptoms_severity_level_check CHECK (((severity_level)::text = ANY ((ARRAY['MILD'::character varying, 'MODERATE'::character varying, 'SEVERE'::character varying])::text[])))
);


ALTER TABLE public.clinical_symptoms OWNER TO postgres;

--
-- Name: consultations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consultations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    visit_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    clinician_id uuid NOT NULL,
    presenting_complaint text NOT NULL,
    history_of_presenting_complaint text,
    past_medical_history text,
    examination text,
    diagnosis text NOT NULL,
    treatment_plan text,
    follow_up_instructions text,
    consultation_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.consultations OWNER TO postgres;

--
-- Name: currency_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.currency_config (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    currency_code character varying(3) DEFAULT 'KES'::character varying NOT NULL,
    currency_symbol character varying(10) DEFAULT 'KES'::character varying NOT NULL,
    locale character varying(10) DEFAULT 'en-KE'::character varying NOT NULL,
    decimal_places integer DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.currency_config OWNER TO postgres;

--
-- Name: event_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(50) NOT NULL,
    user_id uuid,
    username character varying(100),
    target_type character varying(50),
    target_id character varying(100),
    action character varying(100) NOT NULL,
    details jsonb,
    ip_address inet,
    user_agent text,
    severity character varying(20) DEFAULT 'LOW'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT event_logs_severity_check CHECK (((severity)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying])::text[])))
);


ALTER TABLE public.event_logs OWNER TO postgres;

--
-- Name: TABLE event_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.event_logs IS 'Comprehensive event logging for system activities, user actions, and security events';


--
-- Name: COLUMN event_logs.event_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.event_type IS 'Type of event (LOGIN, USER, PATIENT, SYSTEM, SECURITY, AUDIT)';


--
-- Name: COLUMN event_logs.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.user_id IS 'ID of the user who performed the action (nullable for system events)';


--
-- Name: COLUMN event_logs.username; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.username IS 'Username for quick reference (denormalized for performance)';


--
-- Name: COLUMN event_logs.target_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.target_type IS 'Type of entity affected (user, patient, visit, etc.)';


--
-- Name: COLUMN event_logs.target_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.target_id IS 'ID of the entity affected';


--
-- Name: COLUMN event_logs.action; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.action IS 'Specific action performed (login, create, update, delete, etc.)';


--
-- Name: COLUMN event_logs.details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.details IS 'Additional event details in JSON format';


--
-- Name: COLUMN event_logs.ip_address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.ip_address IS 'IP address of the client (for security tracking)';


--
-- Name: COLUMN event_logs.user_agent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.user_agent IS 'User agent string (for security tracking)';


--
-- Name: COLUMN event_logs.severity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.severity IS 'Event severity level for filtering and alerting';


--
-- Name: COLUMN event_logs.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.event_logs.created_at IS 'Timestamp when the event occurred';


--
-- Name: family_planning_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.family_planning_methods (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    method_code character varying(20) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    effectiveness_rate numeric(5,2),
    duration_months integer,
    side_effects text,
    contraindications text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.family_planning_methods OWNER TO postgres;

--
-- Name: immunization_schedule_vaccines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.immunization_schedule_vaccines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    schedule_id uuid NOT NULL,
    vaccine_id uuid NOT NULL,
    recommended_age_days integer NOT NULL,
    is_required boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.immunization_schedule_vaccines OWNER TO postgres;

--
-- Name: immunization_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.immunization_schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    age_group character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.immunization_schedules OWNER TO postgres;

--
-- Name: immunization_vaccines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.immunization_vaccines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    vaccine_code character varying(20) NOT NULL,
    description text,
    manufacturer character varying(100),
    dosage character varying(50),
    route character varying(50),
    storage_requirements text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.immunization_vaccines OWNER TO postgres;

--
-- Name: inventory_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_batches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    inventory_item_id uuid NOT NULL,
    batch_number character varying(100) NOT NULL,
    quantity integer NOT NULL,
    original_quantity integer NOT NULL,
    unit_cost numeric(10,2) NOT NULL,
    selling_price numeric(10,2) NOT NULL,
    expiry_date date NOT NULL,
    supplier_name character varying(200),
    received_date date DEFAULT CURRENT_DATE,
    received_by uuid NOT NULL,
    is_expired boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_batches OWNER TO postgres;

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(200) NOT NULL,
    generic_name character varying(200),
    category character varying(100) NOT NULL,
    unit character varying(50) NOT NULL,
    reorder_level integer DEFAULT 0,
    max_level integer DEFAULT 1000,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    inventory_item_id uuid NOT NULL,
    batch_id uuid,
    movement_type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    unit_cost numeric(10,2),
    reference character varying(200),
    performed_by uuid NOT NULL,
    performed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text,
    CONSTRAINT inventory_movements_movement_type_check CHECK (((movement_type)::text = ANY ((ARRAY['RECEIVE'::character varying, 'DISPENSE'::character varying, 'ADJUST'::character varying, 'EXPIRE'::character varying, 'TRANSFER'::character varying])::text[])))
);


ALTER TABLE public.inventory_movements OWNER TO postgres;

--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    inventory_item_id uuid,
    service_type character varying(100),
    item_name character varying(200) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    batch_id uuid
);


ALTER TABLE public.invoice_items OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_number character varying(50) NOT NULL,
    patient_id uuid,
    op_number character varying(20),
    buyer_name character varying(200),
    buyer_phone character varying(20),
    invoice_type character varying(20) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0,
    balance_amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'UNPAID'::character varying,
    payment_due_date date,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT invoices_invoice_type_check CHECK (((invoice_type)::text = ANY ((ARRAY['PRESCRIPTION'::character varying, 'WALK_IN'::character varying, 'CONSULTATION'::character varying, 'LAB'::character varying])::text[]))),
    CONSTRAINT invoices_status_check CHECK (((status)::text = ANY ((ARRAY['PAID'::character varying, 'PARTIAL'::character varying, 'UNPAID'::character varying])::text[])))
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: lab_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    visit_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    test_type character varying(100) NOT NULL,
    test_name character varying(200) NOT NULL,
    urgency character varying(20) DEFAULT 'ROUTINE'::character varying,
    status character varying(30) DEFAULT 'REQUESTED'::character varying,
    clinical_notes text,
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT lab_requests_status_check CHECK (((status)::text = ANY ((ARRAY['REQUESTED'::character varying, 'SAMPLE_COLLECTED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT lab_requests_urgency_check CHECK (((urgency)::text = ANY ((ARRAY['ROUTINE'::character varying, 'URGENT'::character varying, 'STAT'::character varying])::text[])))
);


ALTER TABLE public.lab_requests OWNER TO postgres;

--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_results (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    lab_request_id uuid NOT NULL,
    result_data jsonb NOT NULL,
    reference_ranges jsonb,
    abnormal_flags jsonb,
    technician_notes text,
    verified_by uuid,
    verified_at timestamp without time zone,
    reported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.lab_results OWNER TO postgres;

--
-- Name: stock_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_category_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stock_categories OWNER TO postgres;

--
-- Name: TABLE stock_categories; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stock_categories IS 'Categories for organizing stock items (medications, tools, equipment, etc.)';


--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category_id uuid NOT NULL,
    sku character varying(100),
    barcode character varying(100),
    unit_of_measure character varying(50) NOT NULL,
    unit_price numeric(10,2) DEFAULT 0.00,
    cost_price numeric(10,2) DEFAULT 0.00,
    selling_price numeric(10,2) DEFAULT 0.00,
    minimum_stock_level integer DEFAULT 0,
    maximum_stock_level integer DEFAULT 1000,
    current_stock integer DEFAULT 0,
    reorder_level integer DEFAULT 10,
    supplier_id uuid,
    expiry_date date,
    batch_number character varying(100),
    location character varying(100),
    is_active boolean DEFAULT true,
    is_controlled_substance boolean DEFAULT false,
    requires_prescription boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.stock_items OWNER TO postgres;

--
-- Name: TABLE stock_items; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stock_items IS 'Individual stock items with details like quantities, prices, and locations';


--
-- Name: low_stock_items; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.low_stock_items AS
 SELECT si.id,
    si.name,
    si.sku,
    sc.name AS category_name,
    si.current_stock,
    si.reorder_level,
    si.minimum_stock_level,
    si.location,
        CASE
            WHEN (si.current_stock <= 0) THEN 'OUT_OF_STOCK'::text
            WHEN (si.current_stock <= si.reorder_level) THEN 'LOW_STOCK'::text
            ELSE 'CRITICAL_STOCK'::text
        END AS alert_level
   FROM (public.stock_items si
     JOIN public.stock_categories sc ON ((si.category_id = sc.id)))
  WHERE ((si.is_active = true) AND (si.current_stock <= si.reorder_level));


ALTER TABLE public.low_stock_items OWNER TO postgres;

--
-- Name: mch_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mch_services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    service_code character varying(20) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    target_population character varying(100),
    frequency character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.mch_services OWNER TO postgres;

--
-- Name: migration_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migration_jobs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    file_name character varying(255) NOT NULL,
    file_size bigint NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    total_records integer DEFAULT 0,
    processed_records integer DEFAULT 0,
    successful_records integer DEFAULT 0,
    failed_records integer DEFAULT 0,
    error_log text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT migration_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PROCESSING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying])::text[])))
);


ALTER TABLE public.migration_jobs OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    data jsonb,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['patient_assignment'::character varying, 'prescription_update'::character varying, 'lab_result'::character varying, 'payment_received'::character varying, 'visit_update'::character varying, 'system_alert'::character varying, 'sync_event'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.notifications IS 'Stores user notifications and system alerts for real-time communication';


--
-- Name: COLUMN notifications.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.user_id IS 'ID of the user who will receive the notification';


--
-- Name: COLUMN notifications.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.type IS 'Type of notification (patient_assignment, prescription_update, etc.)';


--
-- Name: COLUMN notifications.title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.title IS 'Short title for the notification';


--
-- Name: COLUMN notifications.message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.message IS 'Detailed message content';


--
-- Name: COLUMN notifications.data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.data IS 'Additional data in JSON format';


--
-- Name: COLUMN notifications.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.priority IS 'Priority level of the notification';


--
-- Name: COLUMN notifications.is_read; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.is_read IS 'Whether the notification has been read by the user';


--
-- Name: COLUMN notifications.read_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.read_at IS 'Timestamp when the notification was read';


--
-- Name: COLUMN notifications.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.created_at IS 'When the notification was created';


--
-- Name: patient_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    assigned_to_user_id uuid NOT NULL,
    assigned_by_user_id uuid NOT NULL,
    assignment_type character varying(50) DEFAULT 'GENERAL'::character varying NOT NULL,
    assignment_reason text,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'NORMAL'::character varying,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    due_date date,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patient_assignments_assignment_type_check CHECK (((assignment_type)::text = ANY ((ARRAY['GENERAL'::character varying, 'PRIMARY_CARE'::character varying, 'SPECIALIST'::character varying, 'NURSE'::character varying, 'PHARMACIST'::character varying, 'FOLLOW_UP'::character varying, 'REFERRAL'::character varying])::text[]))),
    CONSTRAINT patient_assignments_priority_check CHECK (((priority)::text = ANY ((ARRAY['LOW'::character varying, 'NORMAL'::character varying, 'HIGH'::character varying, 'URGENT'::character varying])::text[]))),
    CONSTRAINT patient_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'TRANSFERRED'::character varying])::text[])))
);


ALTER TABLE public.patient_assignments OWNER TO postgres;

--
-- Name: TABLE patient_assignments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.patient_assignments IS 'Manages patient assignments to different users for various care purposes';


--
-- Name: COLUMN patient_assignments.patient_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.patient_id IS 'ID of the patient being assigned';


--
-- Name: COLUMN patient_assignments.assigned_to_user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.assigned_to_user_id IS 'ID of the user the patient is assigned to';


--
-- Name: COLUMN patient_assignments.assigned_by_user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.assigned_by_user_id IS 'ID of the user who made the assignment';


--
-- Name: COLUMN patient_assignments.assignment_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.assignment_type IS 'Type of assignment (GENERAL, PRIMARY_CARE, SPECIALIST, etc.)';


--
-- Name: COLUMN patient_assignments.assignment_reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.assignment_reason IS 'Reason for the assignment';


--
-- Name: COLUMN patient_assignments.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.status IS 'Current status of the assignment';


--
-- Name: COLUMN patient_assignments.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.priority IS 'Priority level of the assignment';


--
-- Name: COLUMN patient_assignments.assigned_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.assigned_at IS 'When the assignment was made';


--
-- Name: COLUMN patient_assignments.completed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.completed_at IS 'When the assignment was completed';


--
-- Name: COLUMN patient_assignments.due_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.due_date IS 'Optional due date for the assignment';


--
-- Name: COLUMN patient_assignments.notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.patient_assignments.notes IS 'Additional notes about the assignment';


--
-- Name: patient_encounters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_encounters (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    patient_id uuid NOT NULL,
    visit_id uuid NOT NULL,
    encounter_type character varying(50) NOT NULL,
    encounter_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completion_date timestamp without time zone,
    chief_complaint text,
    diagnosis_codes character varying(20)[],
    diagnosis_descriptions text[],
    treatment_summary text,
    services_provided jsonb,
    medications_prescribed jsonb,
    lab_tests_ordered jsonb,
    procedures_performed jsonb,
    primary_provider uuid NOT NULL,
    consulting_providers uuid[] DEFAULT '{}'::uuid[],
    department character varying(100),
    location character varying(100),
    total_charges numeric(10,2) DEFAULT 0,
    insurance_eligible boolean DEFAULT false,
    sha_eligible boolean DEFAULT false,
    private_pay boolean DEFAULT false,
    status character varying(30) DEFAULT 'IN_PROGRESS'::character varying,
    completion_triggered_invoice boolean DEFAULT false,
    invoice_id uuid,
    sha_claim_id uuid,
    created_by uuid NOT NULL,
    completed_by uuid,
    billed_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    payment_type character varying(20),
    payment_reference character varying(100),
    CONSTRAINT patient_encounters_encounter_type_check CHECK (((encounter_type)::text = ANY ((ARRAY['CONSULTATION'::character varying, 'LAB'::character varying, 'PHARMACY'::character varying, 'INPATIENT'::character varying, 'EMERGENCY'::character varying, 'FOLLOW_UP'::character varying, 'PROCEDURE'::character varying])::text[]))),
    CONSTRAINT patient_encounters_payment_type_check CHECK (((payment_type)::text = ANY ((ARRAY['SHA'::character varying, 'PRIVATE'::character varying, 'CASH'::character varying, 'NHIF'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT patient_encounters_status_check CHECK (((status)::text = ANY ((ARRAY['IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'INVOICE_GENERATED'::character varying, 'BILLED'::character varying])::text[])))
);


ALTER TABLE public.patient_encounters OWNER TO postgres;

--
-- Name: patient_family_planning; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_family_planning (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    patient_id uuid NOT NULL,
    visit_id uuid,
    method_id uuid NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    provider_id uuid NOT NULL,
    counseling_provided boolean DEFAULT false,
    counseling_notes text,
    side_effects_experienced text,
    satisfaction_rating integer,
    follow_up_date date,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    discontinuation_reason text,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patient_family_planning_satisfaction_rating_check CHECK (((satisfaction_rating >= 1) AND (satisfaction_rating <= 5))),
    CONSTRAINT patient_family_planning_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'DISCONTINUED'::character varying, 'COMPLETED'::character varying, 'SWITCHED'::character varying])::text[])))
);


ALTER TABLE public.patient_family_planning OWNER TO postgres;

--
-- Name: patient_immunizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_immunizations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    patient_id uuid NOT NULL,
    visit_id uuid,
    vaccine_id uuid NOT NULL,
    immunization_date date DEFAULT CURRENT_DATE NOT NULL,
    age_at_immunization_days integer,
    batch_number character varying(50),
    expiry_date date,
    administered_by uuid NOT NULL,
    site character varying(50),
    route character varying(50),
    dosage character varying(50),
    adverse_reactions text,
    next_due_date date,
    status character varying(20) DEFAULT 'COMPLETED'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patient_immunizations_status_check CHECK (((status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'COMPLETED'::character varying, 'MISSED'::character varying, 'CONTRAINDICATED'::character varying])::text[])))
);


ALTER TABLE public.patient_immunizations OWNER TO postgres;

--
-- Name: patient_mch_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patient_mch_services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    patient_id uuid NOT NULL,
    visit_id uuid,
    service_id uuid NOT NULL,
    service_date date DEFAULT CURRENT_DATE NOT NULL,
    provider_id uuid NOT NULL,
    service_details jsonb,
    findings text,
    recommendations text,
    next_appointment_date date,
    status character varying(20) DEFAULT 'COMPLETED'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patient_mch_services_status_check CHECK (((status)::text = ANY ((ARRAY['SCHEDULED'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying, 'NO_SHOW'::character varying])::text[])))
);


ALTER TABLE public.patient_mch_services OWNER TO postgres;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    op_number character varying(20) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    date_of_birth date,
    age integer,
    gender character varying(10),
    phone_number character varying(20),
    area character varying(100),
    next_of_kin character varying(200),
    next_of_kin_phone character varying(20),
    insurance_type character varying(20) NOT NULL,
    insurance_number character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patients_gender_check CHECK (((gender)::text = ANY ((ARRAY['MALE'::character varying, 'FEMALE'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT patients_insurance_type_check CHECK (((insurance_type)::text = ANY ((ARRAY['SHA'::character varying, 'PRIVATE'::character varying, 'CASH'::character varying])::text[])))
);


ALTER TABLE public.patients OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(20) NOT NULL,
    mpesa_reference character varying(100),
    bank_reference character varying(100),
    received_by uuid NOT NULL,
    received_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reconciled boolean DEFAULT false,
    reconciled_at timestamp without time zone,
    notes text,
    CONSTRAINT payments_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['CASH'::character varying, 'MPESA'::character varying, 'BANK_TRANSFER'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: prescription_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prescription_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    prescription_id uuid NOT NULL,
    inventory_item_id uuid NOT NULL,
    item_name character varying(200) NOT NULL,
    dosage character varying(100) NOT NULL,
    frequency character varying(100) NOT NULL,
    duration character varying(100) NOT NULL,
    quantity_prescribed integer NOT NULL,
    quantity_dispensed integer DEFAULT 0,
    instructions text
);


ALTER TABLE public.prescription_items OWNER TO postgres;

--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prescriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    consultation_id uuid NOT NULL,
    visit_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    prescribed_by uuid NOT NULL,
    status character varying(30) DEFAULT 'PENDING'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT prescriptions_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'PARTIALLY_DISPENSED'::character varying, 'FULLY_DISPENSED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.prescriptions OWNER TO postgres;

--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.service_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.service_categories OWNER TO postgres;

--
-- Name: sha_audit_trail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_audit_trail (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    claim_id uuid NOT NULL,
    invoice_id uuid,
    action character varying(100) NOT NULL,
    performed_by uuid NOT NULL,
    performed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    details jsonb NOT NULL,
    ip_address inet,
    user_agent text,
    compliance_check boolean DEFAULT false,
    audit_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sha_audit_trail OWNER TO postgres;

--
-- Name: sha_claim_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_claim_batches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    batch_number character varying(50) NOT NULL,
    batch_date date NOT NULL,
    batch_type character varying(20) DEFAULT 'custom'::character varying,
    total_claims integer NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    submission_date timestamp without time zone,
    completion_date timestamp without time zone,
    sha_batch_reference character varying(100),
    created_by uuid NOT NULL,
    invoice_generated boolean DEFAULT false,
    invoice_generated_at timestamp without time zone,
    printed_invoices boolean DEFAULT false,
    printed_at timestamp without time zone,
    printed_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sha_claim_batches_batch_type_check CHECK (((batch_type)::text = ANY ((ARRAY['weekly'::character varying, 'monthly'::character varying, 'custom'::character varying])::text[]))),
    CONSTRAINT sha_claim_batches_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.sha_claim_batches OWNER TO postgres;

--
-- Name: sha_claim_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_claim_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    claim_id uuid NOT NULL,
    service_type character varying(100) NOT NULL,
    service_code character varying(50) NOT NULL,
    service_description text NOT NULL,
    service_date date NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    sha_service_code character varying(50),
    sha_service_category character varying(100),
    sha_tariff_code character varying(50),
    approved_quantity integer,
    approved_unit_price numeric(10,2),
    approved_amount numeric(10,2),
    rejection_reason text,
    prescription_notes text,
    treatment_notes text,
    dosage_instructions text,
    diagnosis_justification text,
    provided_by uuid,
    department character varying(100),
    facility_level character varying(20),
    is_emergency boolean DEFAULT false,
    requires_pre_authorization boolean DEFAULT false,
    pre_authorization_number character varying(100),
    compliance_verified boolean DEFAULT false,
    verification_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sha_claim_items_service_type_check CHECK (((service_type)::text = ANY ((ARRAY['CONSULTATION'::character varying, 'DIAGNOSTIC'::character varying, 'LABORATORY'::character varying, 'PHARMACY'::character varying, 'PROCEDURE'::character varying, 'INPATIENT'::character varying, 'EMERGENCY'::character varying, 'DENTAL'::character varying, 'OPTICAL'::character varying])::text[])))
);


ALTER TABLE public.sha_claim_items OWNER TO postgres;

--
-- Name: sha_claims; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_claims (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    claim_number character varying(50) NOT NULL,
    patient_id uuid NOT NULL,
    op_number character varying(20) NOT NULL,
    visit_id uuid NOT NULL,
    patient_name character varying(200) NOT NULL,
    sha_beneficiary_id character varying(50) NOT NULL,
    national_id character varying(20),
    phone_number character varying(20),
    visit_date date NOT NULL,
    primary_diagnosis_code character varying(20) NOT NULL,
    primary_diagnosis_description text NOT NULL,
    secondary_diagnosis_codes character varying(200)[],
    secondary_diagnosis_descriptions text[],
    provider_code character varying(50) NOT NULL,
    provider_name character varying(200) NOT NULL,
    facility_level character varying(20),
    claim_amount numeric(10,2) NOT NULL,
    approved_amount numeric(10,2),
    paid_amount numeric(10,2) DEFAULT 0,
    balance_variance numeric(10,2) DEFAULT 0,
    status character varying(30) DEFAULT 'DRAFT'::character varying,
    submission_date timestamp without time zone,
    approval_date timestamp without time zone,
    rejection_date timestamp without time zone,
    payment_date timestamp without time zone,
    sha_reference character varying(100),
    sha_transaction_reference character varying(100),
    sha_payment_reference character varying(100),
    batch_id character varying(100),
    rejection_reason text,
    compliance_notes text,
    requires_documents boolean DEFAULT false,
    documents_attached integer DEFAULT 0,
    last_reviewed_at timestamp without time zone,
    reviewed_by uuid,
    created_by uuid NOT NULL,
    submitted_by uuid,
    approved_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sha_claims_facility_level_check CHECK (((facility_level)::text = ANY ((ARRAY['Level1'::character varying, 'Level2'::character varying, 'Level3'::character varying, 'Level4'::character varying, 'Level5'::character varying, 'Level6'::character varying])::text[]))),
    CONSTRAINT sha_claims_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'READY_TO_SUBMIT'::character varying, 'INVOICE_GENERATED'::character varying, 'SUBMITTED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'PARTIALLY_PAID'::character varying, 'PAID'::character varying])::text[])))
);


ALTER TABLE public.sha_claims OWNER TO postgres;

--
-- Name: sha_compliance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_compliance (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    claim_id uuid NOT NULL,
    invoice_id uuid NOT NULL,
    compliance_type character varying(30) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    verification_date timestamp without time zone,
    verified_by uuid,
    notes text,
    required_actions text[],
    next_review_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sha_compliance_compliance_type_check CHECK (((compliance_type)::text = ANY ((ARRAY['invoice_generation'::character varying, 'submission'::character varying, 'payment'::character varying, 'audit'::character varying])::text[]))),
    CONSTRAINT sha_compliance_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.sha_compliance OWNER TO postgres;

--
-- Name: sha_document_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_document_attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    claim_id uuid NOT NULL,
    invoice_id uuid,
    document_type character varying(50) NOT NULL,
    document_name character varying(255) NOT NULL,
    document_description text,
    file_path character varying(500) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    is_required boolean DEFAULT false,
    compliance_verified boolean DEFAULT false,
    verification_date timestamp without time zone,
    verification_notes text,
    sha_document_reference character varying(100),
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    access_count integer DEFAULT 0,
    last_accessed_at timestamp without time zone,
    last_accessed_by uuid,
    encryption_status character varying(20) DEFAULT 'encrypted'::character varying,
    retention_period integer DEFAULT 2555,
    deletion_scheduled_date date,
    is_archived boolean DEFAULT false,
    archived_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sha_document_attachments_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['LAB_RESULTS'::character varying, 'DISCHARGE_SUMMARY'::character varying, 'PRESCRIPTION'::character varying, 'REFERRAL_LETTER'::character varying, 'MEDICAL_REPORT'::character varying, 'IMAGING_REPORT'::character varying, 'CONSENT_FORM'::character varying, 'INSURANCE_CARD'::character varying, 'IDENTIFICATION'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT sha_document_attachments_encryption_status_check CHECK (((encryption_status)::text = ANY ((ARRAY['encrypted'::character varying, 'unencrypted'::character varying])::text[])))
);


ALTER TABLE public.sha_document_attachments OWNER TO postgres;

--
-- Name: sha_export_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_export_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    export_type character varying(20) NOT NULL,
    export_scope character varying(20) NOT NULL,
    date_from date,
    date_to date,
    patient_ids uuid[],
    claim_statuses character varying(30)[],
    invoice_ids uuid[],
    batch_ids uuid[],
    total_records integer NOT NULL,
    file_path character varying(500),
    file_size bigint,
    download_count integer DEFAULT 0,
    export_reason character varying(200) NOT NULL,
    audit_trail_reference character varying(100),
    compliance_approved boolean DEFAULT false,
    approved_by uuid,
    approval_date timestamp without time zone,
    exported_by uuid NOT NULL,
    exported_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sha_export_logs_export_scope_check CHECK (((export_scope)::text = ANY ((ARRAY['SINGLE_INVOICE'::character varying, 'BATCH'::character varying, 'DATE_RANGE'::character varying, 'CUSTOM_FILTER'::character varying])::text[]))),
    CONSTRAINT sha_export_logs_export_type_check CHECK (((export_type)::text = ANY ((ARRAY['PDF'::character varying, 'EXCEL'::character varying, 'CSV'::character varying, 'JSON'::character varying])::text[])))
);


ALTER TABLE public.sha_export_logs OWNER TO postgres;

--
-- Name: sha_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_number character varying(50) NOT NULL,
    claim_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    op_number character varying(20) NOT NULL,
    visit_id uuid,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    generated_at timestamp without time zone,
    generated_by uuid NOT NULL,
    printed_at timestamp without time zone,
    printed_by uuid,
    submitted_at timestamp without time zone,
    submitted_by uuid,
    sha_reference character varying(100),
    batch_reference character varying(100),
    compliance_status character varying(20) DEFAULT 'pending'::character varying,
    audit_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sha_invoices_compliance_status_check CHECK (((compliance_status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT sha_invoices_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'generated'::character varying, 'printed'::character varying, 'submitted'::character varying, 'paid'::character varying])::text[])))
);


ALTER TABLE public.sha_invoices OWNER TO postgres;

--
-- Name: sha_submission_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_submission_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    claim_id uuid,
    batch_id uuid,
    invoice_id uuid,
    submission_type character varying(20) NOT NULL,
    submission_method character varying(20) DEFAULT 'api'::character varying,
    request_payload jsonb,
    response_payload jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    error_message text,
    retry_count integer DEFAULT 0,
    next_retry_at timestamp without time zone,
    compliance_check boolean DEFAULT false,
    audit_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sha_submission_logs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'success'::character varying, 'failed'::character varying, 'retry'::character varying])::text[]))),
    CONSTRAINT sha_submission_logs_submission_method_check CHECK (((submission_method)::text = ANY ((ARRAY['api'::character varying, 'portal'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT sha_submission_logs_submission_type_check CHECK (((submission_type)::text = ANY ((ARRAY['single'::character varying, 'batch'::character varying])::text[])))
);


ALTER TABLE public.sha_submission_logs OWNER TO postgres;

--
-- Name: sha_workflow_instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_workflow_instances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    claim_id uuid NOT NULL,
    workflow_type character varying(50) NOT NULL,
    overall_status character varying(30) DEFAULT 'INITIATED'::character varying NOT NULL,
    current_step character varying(50) NOT NULL,
    total_steps integer DEFAULT 1 NOT NULL,
    completed_steps integer DEFAULT 0 NOT NULL,
    step_details jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    initiated_by uuid NOT NULL,
    completed_by uuid,
    initiated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sha_workflow_instances_overall_status_check CHECK (((overall_status)::text = ANY ((ARRAY['INITIATED'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT sha_workflow_instances_workflow_type_check CHECK (((workflow_type)::text = ANY ((ARRAY['CLAIM_SUBMISSION'::character varying, 'INVOICE_GENERATION'::character varying, 'DOCUMENT_ATTACHMENT'::character varying, 'COMPLIANCE_REVIEW'::character varying, 'PAYMENT_PROCESSING'::character varying])::text[])))
);


ALTER TABLE public.sha_workflow_instances OWNER TO postgres;

--
-- Name: sha_workflow_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sha_workflow_steps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    workflow_id uuid NOT NULL,
    step_name character varying(100) NOT NULL,
    step_order integer NOT NULL,
    step_type character varying(50) NOT NULL,
    status character varying(30) DEFAULT 'PENDING'::character varying NOT NULL,
    input_data jsonb,
    output_data jsonb,
    error_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    duration_ms integer,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    executed_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sha_workflow_steps_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying, 'SKIPPED'::character varying])::text[]))),
    CONSTRAINT sha_workflow_steps_step_type_check CHECK (((step_type)::text = ANY ((ARRAY['VALIDATION'::character varying, 'PROCESSING'::character varying, 'NOTIFICATION'::character varying, 'APPROVAL'::character varying, 'DOCUMENTATION'::character varying])::text[])))
);


ALTER TABLE public.sha_workflow_steps OWNER TO postgres;

--
-- Name: stock_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stock_item_id uuid NOT NULL,
    adjustment_type character varying(50) NOT NULL,
    quantity_before integer NOT NULL,
    quantity_after integer NOT NULL,
    quantity_adjusted integer NOT NULL,
    reason character varying(255) NOT NULL,
    notes text,
    adjusted_by uuid NOT NULL,
    adjustment_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    approved_by uuid,
    approval_date timestamp without time zone
);


ALTER TABLE public.stock_adjustments OWNER TO postgres;

--
-- Name: TABLE stock_adjustments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stock_adjustments IS 'Manual stock adjustments with approval workflow';


--
-- Name: stock_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stock_item_id uuid NOT NULL,
    alert_type character varying(50) NOT NULL,
    current_stock integer,
    threshold_value integer,
    message text NOT NULL,
    is_resolved boolean DEFAULT false,
    resolved_by uuid,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stock_alerts OWNER TO postgres;

--
-- Name: TABLE stock_alerts; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stock_alerts IS 'Low stock and expiry alerts for inventory management';


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stock_item_id uuid NOT NULL,
    movement_type character varying(50) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2),
    total_value numeric(10,2),
    reference_type character varying(50),
    reference_id uuid,
    reason text,
    batch_number character varying(100),
    expiry_date date,
    location_from character varying(100),
    location_to character varying(100),
    performed_by uuid NOT NULL,
    movement_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text
);


ALTER TABLE public.stock_movements OWNER TO postgres;

--
-- Name: TABLE stock_movements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stock_movements IS 'All stock movements (in, out, adjustments) for audit trail';


--
-- Name: stock_purchase_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_purchase_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_id uuid NOT NULL,
    stock_item_id uuid NOT NULL,
    quantity_ordered integer NOT NULL,
    quantity_received integer DEFAULT 0,
    unit_cost numeric(10,2) NOT NULL,
    total_cost numeric(10,2) NOT NULL,
    expiry_date date,
    batch_number character varying(100),
    notes text
);


ALTER TABLE public.stock_purchase_items OWNER TO postgres;

--
-- Name: stock_purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_number character varying(100) NOT NULL,
    supplier_id uuid NOT NULL,
    purchase_date date NOT NULL,
    expected_delivery_date date,
    actual_delivery_date date,
    total_amount numeric(10,2) DEFAULT 0.00,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stock_purchases OWNER TO postgres;

--
-- Name: TABLE stock_purchases; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stock_purchases IS 'Purchase orders for restocking inventory';


--
-- Name: stock_request_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_request_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stock_request_id uuid NOT NULL,
    stock_item_id uuid NOT NULL,
    requested_quantity integer NOT NULL,
    approved_quantity integer DEFAULT 0,
    fulfilled_quantity integer DEFAULT 0,
    unit_price numeric(10,2),
    total_cost numeric(10,2),
    notes text
);


ALTER TABLE public.stock_request_items OWNER TO postgres;

--
-- Name: stock_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requested_by uuid NOT NULL,
    requested_for uuid,
    request_type character varying(50) NOT NULL,
    priority character varying(20) DEFAULT 'NORMAL'::character varying,
    status character varying(20) DEFAULT 'PENDING'::character varying,
    request_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    required_date date,
    notes text,
    approved_by uuid,
    approval_date timestamp without time zone,
    fulfilled_by uuid,
    fulfillment_date timestamp without time zone
);


ALTER TABLE public.stock_requests OWNER TO postgres;

--
-- Name: TABLE stock_requests; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stock_requests IS 'Internal stock requests from staff members';


--
-- Name: stock_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.stock_summary AS
 SELECT si.id,
    si.name,
    si.sku,
    sc.name AS category_name,
    si.unit_of_measure,
    si.current_stock,
    si.minimum_stock_level,
    si.reorder_level,
    si.unit_price,
    si.cost_price,
    si.selling_price,
    si.location,
    si.is_active,
        CASE
            WHEN (si.current_stock <= 0) THEN 'OUT_OF_STOCK'::text
            WHEN (si.current_stock <= si.reorder_level) THEN 'LOW_STOCK'::text
            WHEN (si.current_stock <= si.minimum_stock_level) THEN 'CRITICAL_STOCK'::text
            ELSE 'IN_STOCK'::text
        END AS stock_status,
    ((si.current_stock)::numeric * si.cost_price) AS total_cost_value,
    ((si.current_stock)::numeric * si.selling_price) AS total_selling_value
   FROM (public.stock_items si
     JOIN public.stock_categories sc ON ((si.category_id = sc.id)))
  WHERE (si.is_active = true);


ALTER TABLE public.stock_summary OWNER TO postgres;

--
-- Name: stock_suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    contact_person character varying(255),
    email character varying(255),
    phone character varying(50),
    address text,
    city character varying(100),
    country character varying(100),
    payment_terms character varying(100),
    delivery_terms character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.stock_suppliers OWNER TO postgres;

--
-- Name: TABLE stock_suppliers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.stock_suppliers IS 'Suppliers for stock purchases';


--
-- Name: user_presence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_presence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status character varying(20) DEFAULT 'offline'::character varying NOT NULL,
    last_seen timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    current_page character varying(200),
    current_activity character varying(200),
    is_typing boolean DEFAULT false,
    typing_entity_id character varying(100),
    typing_entity_type character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_presence_status_check CHECK (((status)::text = ANY ((ARRAY['online'::character varying, 'away'::character varying, 'busy'::character varying, 'offline'::character varying])::text[])))
);


ALTER TABLE public.user_presence OWNER TO postgres;

--
-- Name: TABLE user_presence; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_presence IS 'Tracks user online status, current activity, and real-time collaboration state';


--
-- Name: COLUMN user_presence.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_presence.user_id IS 'ID of the user whose presence is being tracked';


--
-- Name: COLUMN user_presence.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_presence.status IS 'Current online status of the user';


--
-- Name: COLUMN user_presence.last_seen; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_presence.last_seen IS 'Last time the user was active';


--
-- Name: COLUMN user_presence.current_page; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_presence.current_page IS 'Current page the user is viewing';


--
-- Name: COLUMN user_presence.current_activity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_presence.current_activity IS 'Current activity the user is performing';


--
-- Name: COLUMN user_presence.is_typing; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_presence.is_typing IS 'Whether the user is currently typing';


--
-- Name: COLUMN user_presence.typing_entity_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_presence.typing_entity_id IS 'ID of the entity the user is typing in';


--
-- Name: COLUMN user_presence.typing_entity_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_presence.typing_entity_type IS 'Type of entity the user is typing in';


--
-- Name: COLUMN user_presence.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_presence.created_at IS 'When the presence record was created';


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token character varying(500) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255),
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    is_locked boolean DEFAULT false,
    failed_login_attempts integer DEFAULT 0,
    last_login_at timestamp without time zone,
    totp_secret character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'RECEPTIONIST'::character varying, 'NURSE'::character varying, 'CLINICAL_OFFICER'::character varying, 'PHARMACIST'::character varying, 'INVENTORY_MANAGER'::character varying, 'CLAIMS_MANAGER'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visits (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    patient_id uuid NOT NULL,
    op_number character varying(20) NOT NULL,
    visit_date date DEFAULT CURRENT_DATE NOT NULL,
    status character varying(30) DEFAULT 'REGISTERED'::character varying NOT NULL,
    chief_complaint text,
    triage_category character varying(20) DEFAULT 'NORMAL'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    payment_type character varying(20),
    payment_reference character varying(100),
    CONSTRAINT visits_payment_type_check CHECK (((payment_type)::text = ANY ((ARRAY['SHA'::character varying, 'PRIVATE'::character varying, 'CASH'::character varying, 'NHIF'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT visits_status_check CHECK (((status)::text = ANY ((ARRAY['REGISTERED'::character varying, 'TRIAGED'::character varying, 'WAITING_CONSULTATION'::character varying, 'IN_CONSULTATION'::character varying, 'WAITING_LAB'::character varying, 'LAB_RESULTS_READY'::character varying, 'WAITING_PHARMACY'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT visits_triage_category_check CHECK (((triage_category)::text = ANY ((ARRAY['EMERGENCY'::character varying, 'URGENT'::character varying, 'NORMAL'::character varying])::text[])))
);


ALTER TABLE public.visits OWNER TO postgres;

--
-- Name: vitals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vitals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    visit_id uuid NOT NULL,
    temperature numeric(4,1),
    blood_pressure_systolic integer,
    blood_pressure_diastolic integer,
    heart_rate integer,
    respiratory_rate integer,
    oxygen_saturation integer,
    weight numeric(5,2),
    height numeric(5,2),
    bmi numeric(4,1),
    recorded_by uuid NOT NULL,
    recorded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.vitals OWNER TO postgres;

--
-- Data for Name: accounts_receivable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts_receivable (id, invoice_id, patient_id, op_number, original_amount, remaining_amount, due_date, aging_bucket, status, last_reminder_sent, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, username, action, target_type, target_id, op_number, details, ip_address, user_agent, "timestamp", checksum) FROM stdin;
\.


--
-- Data for Name: cash_reconciliations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_reconciliations (id, shift_date, opening_float, expected_cash, actual_cash, variance, notes, reconciled_by, reconciled_at) FROM stdin;
\.


--
-- Data for Name: clinical_diagnosis_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clinical_diagnosis_codes (id, code, description, category, subcategory, is_active, usage_count, search_keywords, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clinical_lab_tests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clinical_lab_tests (id, test_code, test_name, test_category, specimen_type, turnaround_time, is_active, usage_count, search_keywords, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clinical_medications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clinical_medications (id, name, generic_name, dosage_form, strength, manufacturer, is_active, usage_count, search_keywords, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clinical_procedures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clinical_procedures (id, procedure_code, procedure_name, procedure_category, complexity, is_active, usage_count, search_keywords, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clinical_symptoms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clinical_symptoms (id, symptom_name, symptom_category, severity_level, is_active, usage_count, search_keywords, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: consultations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consultations (id, visit_id, patient_id, clinician_id, presenting_complaint, history_of_presenting_complaint, past_medical_history, examination, diagnosis, treatment_plan, follow_up_instructions, consultation_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: currency_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.currency_config (id, currency_code, currency_symbol, locale, decimal_places, is_active, created_at, updated_at) FROM stdin;
61f4f964-8b70-48cd-a594-ea2044c24817	KES	KES	en-KE	2	t	2025-09-04 10:06:25.674488	2025-09-04 10:06:25.674488
\.


--
-- Data for Name: event_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_logs (id, event_type, user_id, username, target_type, target_id, action, details, ip_address, user_agent, severity, created_at) FROM stdin;
ec7ccd86-0f1c-466e-8dfa-7c581f361f3a	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-07 18:23:45.021+00
11ec593c-ab4a-4a99-87c9-a030812d4e29	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-07 18:48:09.725+00
2c8f03d5-3a01-40fb-affd-1b9349629320	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-07 19:06:27.69+00
5d0384d1-bf94-4c92-b65e-a518b0dd2990	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-07 19:22:29.733+00
76f6b602-220d-413d-a189-51c7451b8cdf	PATIENT	550e8400-e29b-41d4-a716-446655440000	admin	patient_assignment	86230d1b-e71e-41a5-9536-9074dfd6bc52	create_assignment	{"priority": "NORMAL", "patient_id": "b089e9f4-1f4b-47e8-9ad7-0fb6c258931a", "assignment_type": "GENERAL", "assigned_to_user_id": "550e8400-e29b-41d4-a716-446655440000"}	::ffff:172.18.0.1	curl/8.5.0	MEDIUM	2025-09-07 19:31:31.066+00
485b78f1-117a-4850-b04f-4dc6a6afea5a	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-08 09:06:25.763+00
5ce088e0-5842-4f1a-82ad-34fa91b21e25	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-08 09:33:12.423+00
fd949df5-3f71-4f67-8ec2-0fa59c144980	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-08 09:57:56.658+00
76a8ce26-ca2a-43f2-9e82-e7d28168f2ec	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-08 12:12:57.986+00
7aad77aa-9ec3-4f15-9d18-837d3ab6083f	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-08 12:15:54.671+00
91e0de94-49a1-4dd9-b679-59e10746e5d4	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-08 14:12:22.556+00
77362d57-fc64-4002-8989-9f61000d9fb7	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-09 06:41:24.816+00
2e748044-2814-4bdf-a15e-a97e4f72b06d	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_failed	{"reason": "invalid_password", "max_attempts": 5, "failed_attempts": 1}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	MEDIUM	2025-09-09 07:10:29.81+00
7860b851-d191-4f0a-8083-ddceda0aa4e6	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_failed	{"reason": "invalid_password", "max_attempts": 5, "failed_attempts": 2}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	MEDIUM	2025-09-09 07:10:30.074+00
47da0ea9-e7ac-4b4a-9e08-48a14988fdfe	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 2}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-09 07:10:35.777+00
6a2a4d91-f28c-4600-a765-3547104b6955	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-09 07:32:21.28+00
04c797de-5531-4cf2-9483-1798fee5212b	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	axios/1.11.0	LOW	2025-09-09 07:48:43.136+00
7cdedfcc-d2b1-4d8f-b143-9546e07fef93	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	axios/1.11.0	LOW	2025-09-09 07:51:43.662+00
532cbaa6-934d-42e6-9cf4-d54852c3a897	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-09 09:23:32.615+00
f89f67ba-d016-4596-9502-88fbbb6c406c	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-09 09:59:43.5+00
cb98d74a-95e8-4ec3-bf85-189e30426694	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-09 10:13:52.494+00
fca7333e-4278-4b17-9dbc-15865c94ad54	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-09 10:14:38.534+00
f7b05338-3374-4670-8f85-5876c509dd21	LOGIN	\N	temp.admin	\N	\N	login_failed	{"reason": "invalid_password", "max_attempts": 5, "failed_attempts": 1}	::ffff:172.18.0.1	curl/8.5.0	MEDIUM	2025-09-08 09:13:35.184+00
a4e6b9bf-0b33-404f-93c8-cf8b8397cbd5	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-09 10:19:07.424+00
652dce9e-dc14-4f7f-a52b-6324215b107a	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-09 10:24:12.091+00
e307dee6-107a-4c9e-a4ed-ac59f733337f	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	axios/1.11.0	LOW	2025-09-09 10:54:35.201+00
c4cb2488-c3bc-4be2-af0b-066d820761b7	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-09 11:09:51.598+00
a144bf40-f99e-4eaa-b3d6-cbb904080f21	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-09 11:13:10.333+00
4b16c9d3-a432-4d22-8a4e-e6ed5baf58ca	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-09 11:14:32.515+00
8b0fec07-54ff-4049-bbdf-18631c57a74c	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	axios/1.11.0	LOW	2025-09-09 11:15:20.811+00
ae8e40d4-f5e8-41d7-a4c9-814454526e4f	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-09 11:16:19.763+00
df0f1ce2-5d68-416b-9fde-76617fa706f4	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	axios/1.11.0	LOW	2025-09-09 11:49:53.251+00
779971e4-298b-4043-bc93-150447903dbb	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	axios/1.11.0	LOW	2025-09-09 12:28:32.853+00
cd16a7dc-fd90-47f0-9cc0-e7e6b798c87f	STOCK	550e8400-e29b-41d4-a716-446655440000	admin	stock_item	8676dc96-7ca6-4f21-86e9-5e9d441dcd97	create_item	{"sku": "TEST-SYR-10ML-001", "name": "Test Syringe 10ml", "location": "Test Storage Room", "costPrice": 2.5, "createdBy": "550e8400-e29b-41d4-a716-446655440000", "unitPrice": 3.5, "categoryId": "be2a9c08-6b2e-464e-9ada-7dbc120bf4d5", "description": "Test disposable syringe for stock management", "currentStock": 100, "reorderLevel": 30, "sellingPrice": 4, "unitOfMeasure": "pieces", "maximumStockLevel": 500, "minimumStockLevel": 20, "requiresPrescription": false, "isControlledSubstance": false}	::ffff:172.18.0.1	axios/1.11.0	MEDIUM	2025-09-09 12:28:33.08+00
93b76d02-6ff4-44c3-8f52-d834f13e9342	STOCK	550e8400-e29b-41d4-a716-446655440000	admin	stock_item	8676dc96-7ca6-4f21-86e9-5e9d441dcd97	update_item	{"unitPrice": 3.75, "updatedBy": "550e8400-e29b-41d4-a716-446655440000", "currentStock": 150}	::ffff:172.18.0.1	axios/1.11.0	MEDIUM	2025-09-09 12:28:33.129+00
61f7b78d-96e3-45de-8f10-5b07844bcd95	STOCK	550e8400-e29b-41d4-a716-446655440000	admin	stock_item	8676dc96-7ca6-4f21-86e9-5e9d441dcd97	delete_item	{"sku": "TEST-SYR-10ML-001", "itemName": "Test Syringe 10ml"}	::ffff:172.18.0.1	axios/1.11.0	HIGH	2025-09-09 12:28:33.189+00
2389e28c-df3e-4429-bd7c-e4de21217d63	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-09 17:57:34.064+00
6fe328df-8a6e-437e-8bb8-6c150857d8f6	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-10 08:48:11.644+00
3d7da347-db8c-48f7-9e64-8ca07caa8818	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-10 09:08:21.555+00
6e5adccb-7f8e-4679-9280-8f504ca329bd	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-10 09:40:39.663+00
1150b979-3e38-4049-98d7-b307e56fffa9	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-10 10:14:29.042+00
7a114f6e-f642-4e05-9e70-972cf93bef0e	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-11 09:58:37.559+00
2740555a-bbaa-4ebe-9ecf-d1a613311de0	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-11 10:45:07.92+00
6134a05e-85f9-4d69-9dd0-11578103630a	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-11 21:58:11.075+00
8188621d-fe9d-4aa0-b152-f2a5e0082abc	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-11 22:16:59.032+00
1b6e7a03-45a8-49f9-8ecb-1b2c95a0968c	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-11 22:49:44.48+00
90949f1e-0aa9-41a4-a5a8-e2b4d9d05176	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-11 23:21:17.714+00
9fa6ed99-cc30-40e8-a32e-3d27f40536ba	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-11 23:38:30.052+00
a972d0e5-a2bb-474d-95ec-1d3a2fe424ad	LOGIN	\N	temp.admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 1}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-11 23:07:26.157+00
c11bdd9c-7140-48da-9c3d-b5cfd826d3e9	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-12 00:22:24.411+00
eeaed83a-518e-47bc-ac9d-68bd25d729fe	PATIENT	\N	temp.admin	patient_assignment	fc6c40b4-b3a6-40a6-aa2d-e68879c33f5a	create_assignment	{"priority": "NORMAL", "patient_id": "b089e9f4-1f4b-47e8-9ad7-0fb6c258931a", "assignment_type": "GENERAL", "assigned_to_user_id": "9968a800-3619-471a-ba69-4f5b25f6c949"}	::ffff:172.18.0.1	curl/8.5.0	MEDIUM	2025-09-08 09:22:03.628+00
af8981ed-f5cc-46ba-8e12-9505f9b6c222	PATIENT	\N	temp.admin	patient_assignment	fc6c40b4-b3a6-40a6-aa2d-e68879c33f5a	delete_assignment	{"patient_id": "b089e9f4-1f4b-47e8-9ad7-0fb6c258931a", "assignment_type": "GENERAL", "assigned_to_user_id": "9968a800-3619-471a-ba69-4f5b25f6c949"}	::ffff:172.18.0.1	curl/8.5.0	HIGH	2025-09-08 09:24:51.046+00
72cf4ab7-4abd-4c40-887a-9210e702ec87	LOGIN	\N	temp.admin	\N	\N	login_failed	{"reason": "invalid_password", "max_attempts": 5, "failed_attempts": 2}	::ffff:172.18.0.1	curl/8.5.0	MEDIUM	2025-09-08 09:13:45.719+00
b606675e-a80d-4e77-8575-acded267dfd5	LOGIN	\N	temp.admin	\N	\N	login_failed	{"reason": "invalid_password", "max_attempts": 5, "failed_attempts": 3}	::ffff:172.18.0.1	curl/8.5.0	MEDIUM	2025-09-08 09:56:55.074+00
5385ada1-ab64-420b-bcda-54345c5c9caf	LOGIN	\N	temp.admin	\N	\N	login_failed	{"reason": "invalid_password", "max_attempts": 5, "failed_attempts": 1}	::ffff:172.18.0.1	axios/1.11.0	MEDIUM	2025-09-09 07:48:09.341+00
0b37533d-91a6-4c42-b0da-3ada69cced9d	LOGIN	\N	temp.admin	\N	\N	login_failed	{"reason": "invalid_password", "max_attempts": 5, "failed_attempts": 1}	::ffff:172.18.0.1	curl/8.5.0	MEDIUM	2025-09-11 23:02:32.684+00
6b9e8ed0-00c6-461b-bc6c-d4f4dda91e86	LOGIN	\N	temp.admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-11 23:11:32.654+00
c72ff89c-74c4-49bb-9aa4-cec281d3ffed	LOGIN	\N	temp.admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-11 23:11:50.198+00
b2957910-fd69-4215-b341-8a2ffdf83a40	PATIENT	\N	temp.admin	patient_assignment	fc6c40b4-b3a6-40a6-aa2d-e68879c33f5a	update_assignment	{"notes": "completed via API", "status": "COMPLETED", "completed_at": "2025-09-08T09:23:21.634Z"}	::ffff:172.18.0.1	curl/8.5.0	MEDIUM	2025-09-08 09:23:21.666+00
4f5b0b9c-7658-4cf7-9a71-8cd20d74c656	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	curl/8.5.0	LOW	2025-09-12 00:45:26.779+00
21ed64d4-bde7-4f2a-a05d-7083c3a3f187	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-12 00:49:55.077+00
ed76426f-3e9b-4456-96ad-55dc7b99c432	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	LOW	2025-09-12 12:45:32.842+00
a89747fe-b1a0-4918-8279-95f45d6542fc	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 10:42:28.889+00
371d5445-5d7e-49de-9a39-448ab3127756	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 10:42:40.934+00
266b334d-0c57-4b68-9b20-3e33dc8989c4	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 10:59:12.997+00
406b8007-fbfe-4ed4-8793-85055cd5ebf4	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 11:19:39.328+00
50ad8bf3-ff63-4783-a5d9-3411ef0045c4	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 11:20:02.181+00
957f5725-e4e0-46f4-a209-fea4da588916	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 12:28:40.28+00
05f73128-8490-49d2-b902-b567351b6291	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 12:28:49.358+00
ac65492d-a09b-4007-800b-3a400809fdf4	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 12:34:39.789+00
30ac63a7-e276-4eb7-bcee-82f8f0e3ae68	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 12:36:07.464+00
9ed74833-8eca-4777-bf74-d5c0289a95b8	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 14:29:56.536+00
5e63b964-c048-4f25-8a6a-c61f5bb6da48	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 14:33:11.492+00
e42568d5-b61b-4c23-9079-0991d7239975	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 15:37:45.875+00
9894f7e5-6c7e-44b8-bc17-680597cd6434	LOGIN	550e8400-e29b-41d4-a716-446655440000	admin	\N	\N	login_success	{"role": "ADMIN", "previous_failed_attempts": 0}	::ffff:172.18.0.1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	LOW	2025-09-13 15:41:32.483+00
\.


--
-- Data for Name: family_planning_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.family_planning_methods (id, name, method_code, category, description, effectiveness_rate, duration_months, side_effects, contraindications, is_active, created_at, updated_at) FROM stdin;
d24b2364-5965-434b-b5ec-887dca5def4c	Combined Oral Contraceptive	COC	HORMONAL	Daily pill containing estrogen and progestin	99.70	1	\N	\N	t	2025-09-09 11:46:22.646462	2025-09-09 11:46:22.646462
13d8742c-f2c9-4613-91fe-df90618a997d	Progestin-Only Pill	POP	HORMONAL	Daily pill containing only progestin	99.50	1	\N	\N	t	2025-09-09 11:46:22.646462	2025-09-09 11:46:22.646462
d01fcca0-c5c9-4065-bf9e-37419e2c8acf	Injectable Contraceptive	DMPA	HORMONAL	Depot medroxyprogesterone acetate injection	99.70	3	\N	\N	t	2025-09-09 11:46:22.646462	2025-09-09 11:46:22.646462
251dfaa1-be04-4458-a7ef-d52d69a33c7c	Implant	IMPLANT	HORMONAL	Subdermal contraceptive implant	99.90	36	\N	\N	t	2025-09-09 11:46:22.646462	2025-09-09 11:46:22.646462
a5bff49b-1c9a-4a9c-b177-fc7e7e494e68	IUD Copper	IUD_CU	IUD	Intrauterine device with copper	99.20	120	\N	\N	t	2025-09-09 11:46:22.646462	2025-09-09 11:46:22.646462
d9415353-139d-4ba0-94fc-245a0077028b	IUD Hormonal	IUD_H	IUD	Intrauterine device with hormones	99.80	60	\N	\N	t	2025-09-09 11:46:22.646462	2025-09-09 11:46:22.646462
66495c37-4cba-402c-9a70-b8e7f321ede0	Male Condom	CONDOM_M	BARRIER	Male latex or polyurethane condom	98.00	0	\N	\N	t	2025-09-09 11:46:22.646462	2025-09-09 11:46:22.646462
6889aabf-2e99-45ff-96e6-c8a89e93df65	Female Condom	CONDOM_F	BARRIER	Female polyurethane condom	95.00	0	\N	\N	t	2025-09-09 11:46:22.646462	2025-09-09 11:46:22.646462
bd2fb805-7351-46c4-bbae-722457b3e722	Natural Family Planning	NFP	NATURAL	Fertility awareness-based methods	76.00	0	\N	\N	t	2025-09-09 11:46:22.646462	2025-09-09 11:46:22.646462
\.


--
-- Data for Name: immunization_schedule_vaccines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.immunization_schedule_vaccines (id, schedule_id, vaccine_id, recommended_age_days, is_required, created_at) FROM stdin;
\.


--
-- Data for Name: immunization_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.immunization_schedules (id, name, description, age_group, is_active, created_at, updated_at) FROM stdin;
b36695d3-e20d-4b06-922a-85237068b158	BCG Schedule	Bacillus Calmette-Guérin vaccination schedule	At birth	t	2025-09-09 11:46:22.618115	2025-09-09 11:46:22.618115
f5e6244d-8b8b-4aa8-b80d-3416e5d4b690	DPT Schedule	Diphtheria, Pertussis, Tetanus vaccination schedule	6 weeks - 18 months	t	2025-09-09 11:46:22.618115	2025-09-09 11:46:22.618115
5a999db5-35c7-4be5-91dd-565ce752a910	Polio Schedule	Polio vaccination schedule	6 weeks - 18 months	t	2025-09-09 11:46:22.618115	2025-09-09 11:46:22.618115
7fedcc88-f6c1-4dde-a13d-a0d4f4506954	Measles Schedule	Measles vaccination schedule	9-15 months	t	2025-09-09 11:46:22.618115	2025-09-09 11:46:22.618115
9a243e34-a440-4313-9084-1f933e069103	Hepatitis B Schedule	Hepatitis B vaccination schedule	At birth - 6 months	t	2025-09-09 11:46:22.618115	2025-09-09 11:46:22.618115
\.


--
-- Data for Name: immunization_vaccines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.immunization_vaccines (id, name, vaccine_code, description, manufacturer, dosage, route, storage_requirements, is_active, created_at, updated_at) FROM stdin;
37a8a1e7-17e8-4a49-a52b-ce19fbf49ccc	BCG	BCG	Bacillus Calmette-Guérin	Various	0.05ml	ID	\N	t	2025-09-09 11:46:22.632234	2025-09-09 11:46:22.632234
e8fa8286-20b9-48c3-8706-7365b6ff29fe	DPT	DPT	Diphtheria, Pertussis, Tetanus	Various	0.5ml	IM	\N	t	2025-09-09 11:46:22.632234	2025-09-09 11:46:22.632234
aa6a5759-34b1-4fe4-8789-b5f6ef79ba47	Polio	OPV	Oral Polio Vaccine	Various	2 drops	Oral	\N	t	2025-09-09 11:46:22.632234	2025-09-09 11:46:22.632234
d83395b9-731b-4f70-83fa-a2bddad11eea	Measles	MR	Measles-Rubella	Various	0.5ml	SC	\N	t	2025-09-09 11:46:22.632234	2025-09-09 11:46:22.632234
bdffe81e-0f16-4e5e-af69-c1f64a6191d6	Hepatitis B	HBV	Hepatitis B Vaccine	Various	0.5ml	IM	\N	t	2025-09-09 11:46:22.632234	2025-09-09 11:46:22.632234
01510ebf-8ade-4a0c-88a4-8b11db67e7ff	Pentavalent	PENTA	DPT + Hepatitis B + Hib	Various	0.5ml	IM	\N	t	2025-09-09 11:46:22.632234	2025-09-09 11:46:22.632234
\.


--
-- Data for Name: inventory_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_batches (id, inventory_item_id, batch_number, quantity, original_quantity, unit_cost, selling_price, expiry_date, supplier_name, received_date, received_by, is_expired, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_items (id, name, generic_name, category, unit, reorder_level, max_level, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: inventory_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_movements (id, inventory_item_id, batch_id, movement_type, quantity, unit_cost, reference, performed_by, performed_at, notes) FROM stdin;
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_items (id, invoice_id, inventory_item_id, service_type, item_name, quantity, unit_price, total_price, batch_id) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, invoice_number, patient_id, op_number, buyer_name, buyer_phone, invoice_type, subtotal, tax_amount, discount_amount, total_amount, amount_paid, balance_amount, status, payment_due_date, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lab_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_requests (id, visit_id, patient_id, requested_by, test_type, test_name, urgency, status, clinical_notes, requested_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: lab_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lab_results (id, lab_request_id, result_data, reference_ranges, abnormal_flags, technician_notes, verified_by, verified_at, reported_at, created_at) FROM stdin;
\.


--
-- Data for Name: mch_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.mch_services (id, name, service_code, category, description, target_population, frequency, is_active, created_at, updated_at) FROM stdin;
ab64afd2-81f3-46b6-9122-2c9b4981c0a2	Antenatal Care	ANC	ANTENATAL	Prenatal care and monitoring	Pregnant women	Monthly	t	2025-09-09 11:46:22.661168	2025-09-09 11:46:22.661168
83f29d17-c729-43f9-824d-0cae48d3061c	Postnatal Care	PNC	POSTNATAL	Post-delivery care and monitoring	Postpartum women	Weekly	t	2025-09-09 11:46:22.661168	2025-09-09 11:46:22.661168
6952b4c4-0a93-4635-a4a3-88b0504bc78a	Child Health Check	CHC	CHILD_HEALTH	Regular health monitoring for children	Children under 5	Monthly	t	2025-09-09 11:46:22.661168	2025-09-09 11:46:22.661168
2ca030a2-6966-4afe-b549-f0521246cb76	Growth Monitoring	GM	CHILD_HEALTH	Weight and height monitoring	Children under 5	Monthly	t	2025-09-09 11:46:22.661168	2025-09-09 11:46:22.661168
ca00d928-0ce7-4542-ae7b-ae54acc04603	Nutrition Counseling	NC	NUTRITION	Nutritional guidance and support	Pregnant women and children	As needed	t	2025-09-09 11:46:22.661168	2025-09-09 11:46:22.661168
b46e775c-373b-496e-98fb-9d777e2501ed	Breastfeeding Support	BFS	NUTRITION	Lactation support and counseling	Lactating mothers	As needed	t	2025-09-09 11:46:22.661168	2025-09-09 11:46:22.661168
eac66895-157a-4bfc-85b7-cd971be9b17e	Family Planning Counseling	FPC	FAMILY_PLANNING	Contraceptive counseling and education	Women of reproductive age	As needed	t	2025-09-09 11:46:22.661168	2025-09-09 11:46:22.661168
\.


--
-- Data for Name: migration_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migration_jobs (id, file_name, file_size, status, total_records, processed_records, successful_records, failed_records, error_log, started_at, completed_at, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, type, title, message, data, priority, is_read, read_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: patient_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_assignments (id, patient_id, assigned_to_user_id, assigned_by_user_id, assignment_type, assignment_reason, status, priority, assigned_at, completed_at, due_date, notes, created_at, updated_at) FROM stdin;
86230d1b-e71e-41a5-9536-9074dfd6bc52	b089e9f4-1f4b-47e8-9ad7-0fb6c258931a	550e8400-e29b-41d4-a716-446655440000	550e8400-e29b-41d4-a716-446655440000	GENERAL	Test assignment for patient care	ACTIVE	NORMAL	2025-09-07 19:31:31.047587+00	\N	\N	This is a test assignment to verify the system works	2025-09-07 19:31:31.047587+00	2025-09-07 19:31:31.047587+00
\.


--
-- Data for Name: patient_encounters; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_encounters (id, patient_id, visit_id, encounter_type, encounter_date, completion_date, chief_complaint, diagnosis_codes, diagnosis_descriptions, treatment_summary, services_provided, medications_prescribed, lab_tests_ordered, procedures_performed, primary_provider, consulting_providers, department, location, total_charges, insurance_eligible, sha_eligible, private_pay, status, completion_triggered_invoice, invoice_id, sha_claim_id, created_by, completed_by, billed_by, created_at, updated_at, payment_type, payment_reference) FROM stdin;
\.


--
-- Data for Name: patient_family_planning; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_family_planning (id, patient_id, visit_id, method_id, start_date, end_date, provider_id, counseling_provided, counseling_notes, side_effects_experienced, satisfaction_rating, follow_up_date, status, discontinuation_reason, notes, created_at, updated_at) FROM stdin;
9eb9c401-eb79-4584-9bb5-669e26de5911	bc467336-9f2d-4faa-a1b9-bc15118c5a8b	\N	6889aabf-2e99-45ff-96e6-c8a89e93df65	2025-09-09	\N	550e8400-e29b-41d4-a716-446655440000	t	Comprehensive counseling provided	\N	\N	\N	ACTIVE	\N	Test family planning record	2025-09-09 11:49:53.582968	2025-09-09 11:49:53.582968
\.


--
-- Data for Name: patient_immunizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_immunizations (id, patient_id, visit_id, vaccine_id, immunization_date, age_at_immunization_days, batch_number, expiry_date, administered_by, site, route, dosage, adverse_reactions, next_due_date, status, notes, created_at, updated_at) FROM stdin;
284f5049-7a22-47a6-95a2-7b19949871de	29e5a1b7-9415-4965-ab6a-2122a7586880	\N	37a8a1e7-17e8-4a49-a52b-ce19fbf49ccc	2025-09-09	\N	BATCH001	\N	550e8400-e29b-41d4-a716-446655440000	Left arm	IM	0.5ml	\N	\N	COMPLETED	Test immunization record	2025-09-09 11:49:53.45983	2025-09-09 11:49:53.45983
\.


--
-- Data for Name: patient_mch_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patient_mch_services (id, patient_id, visit_id, service_id, service_date, provider_id, service_details, findings, recommendations, next_appointment_date, status, notes, created_at, updated_at) FROM stdin;
08cebd42-c3a8-4009-ac5f-0f7c0542d626	720a2872-aafa-4837-9ff3-e7eb024b4cb6	\N	ab64afd2-81f3-46b6-9122-2c9b4981c0a2	2025-09-09	550e8400-e29b-41d4-a716-446655440000	{"notes": "Regular checkup", "weight": 65.5, "blood_pressure": "120/80", "duration_minutes": 30}	Patient is healthy	Continue regular checkups	\N	COMPLETED	Test MCH service record	2025-09-09 11:49:53.687729	2025-09-09 11:49:53.687729
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patients (id, op_number, first_name, last_name, date_of_birth, age, gender, phone_number, area, next_of_kin, next_of_kin_phone, insurance_type, insurance_number, created_at, updated_at) FROM stdin;
b089e9f4-1f4b-47e8-9ad7-0fb6c258931a	OP-2025-001	John	Doe	\N	30	MALE	0712345678	\N	\N	\N	CASH	\N	2025-09-07 19:31:17.844711	2025-09-07 19:31:17.844711
0a5ababe-2548-4794-a292-0a8a4f46e395	OP-2025-002	Test	Patient	\N	30	MALE	+254712345678	\N	\N	\N	SHA	\N	2025-09-09 10:54:35.27484	2025-09-09 10:54:35.27484
a80e4086-5818-4822-808b-0a84c24d0e00	OP2024001	Imported	Patient1	\N	25	OTHER	+254723456789	\N	\N	\N	PRIVATE	\N	2025-09-09 10:54:35.314181	2025-09-09 10:54:35.314181
c9f95aef-6bc5-444a-97d6-cfddac5fb688	OP2024002	Imported	Patient2	\N	35	OTHER	+254734567890	\N	\N	\N	CASH	\N	2025-09-09 10:54:35.328753	2025-09-09 10:54:35.328753
7ed4b4d9-88de-4e18-a5a2-37c42e4b1946	OP-2025-003	Test	Patient	\N	30	MALE	+254712345678	\N	\N	\N	SHA	\N	2025-09-09 11:15:20.873819	2025-09-09 11:15:20.873819
e2dfb57c-e728-48fc-aaf8-636177bf3c5e	OP-2025-004	Payment	Test	\N	25	MALE	+254712345678	\N	\N	\N	CASH	\N	2025-09-09 11:49:53.304991	2025-09-09 11:49:53.304991
29e5a1b7-9415-4965-ab6a-2122a7586880	OP-2025-005	Immunization	Test	\N	2	FEMALE	+254723456789	\N	\N	\N	CASH	\N	2025-09-09 11:49:53.428241	2025-09-09 11:49:53.428241
bc467336-9f2d-4faa-a1b9-bc15118c5a8b	OP-2025-006	Family	Planning	\N	28	FEMALE	+254734567890	\N	\N	\N	CASH	\N	2025-09-09 11:49:53.552697	2025-09-09 11:49:53.552697
720a2872-aafa-4837-9ff3-e7eb024b4cb6	OP-2025-007	MCH	Patient	\N	25	FEMALE	+254745678901	\N	\N	\N	CASH	\N	2025-09-09 11:49:53.660292	2025-09-09 11:49:53.660292
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, invoice_id, amount, payment_method, mpesa_reference, bank_reference, received_by, received_at, reconciled, reconciled_at, notes) FROM stdin;
\.


--
-- Data for Name: prescription_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prescription_items (id, prescription_id, inventory_item_id, item_name, dosage, frequency, duration, quantity_prescribed, quantity_dispensed, instructions) FROM stdin;
\.


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.prescriptions (id, consultation_id, visit_id, patient_id, prescribed_by, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: service_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.service_categories (id, name, description, is_active, created_at, updated_at) FROM stdin;
94abbaee-8203-4d46-86d5-fa7c7362a86c	GENERAL_CONSULTATION	General medical consultation services	t	2025-09-09 11:46:21.901488	2025-09-09 11:46:21.901488
a1d7d4f2-47f7-4bfd-a7a8-f64d37c82f3b	IMMUNIZATION	Child and adult immunization services	t	2025-09-09 11:46:21.901488	2025-09-09 11:46:21.901488
f1407dd2-4b34-4e7f-ac3c-61c9bd7e916f	FAMILY_PLANNING	Family planning and contraceptive services	t	2025-09-09 11:46:21.901488	2025-09-09 11:46:21.901488
3d23ec2a-9317-4007-8ac9-1c9818f0f639	MCH_SERVICES	Maternal and Child Health services	t	2025-09-09 11:46:21.901488	2025-09-09 11:46:21.901488
d7fc0591-203a-45e9-8769-d6f3835f89c1	LABORATORY	Laboratory and diagnostic services	t	2025-09-09 11:46:21.901488	2025-09-09 11:46:21.901488
85f2514a-7969-4bfb-99e2-7f99066725d4	PHARMACY	Pharmacy and medication services	t	2025-09-09 11:46:21.901488	2025-09-09 11:46:21.901488
dc0f3a47-0ad7-4a16-aa38-cdd6a23fe013	EMERGENCY	Emergency medical services	t	2025-09-09 11:46:21.901488	2025-09-09 11:46:21.901488
c2c6a201-df44-4671-b988-13b06320a222	SPECIALIST	Specialist consultation services	t	2025-09-09 11:46:21.901488	2025-09-09 11:46:21.901488
\.


--
-- Data for Name: sha_audit_trail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_audit_trail (id, claim_id, invoice_id, action, performed_by, performed_at, details, ip_address, user_agent, compliance_check, audit_notes, created_at) FROM stdin;
\.


--
-- Data for Name: sha_claim_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_claim_batches (id, batch_number, batch_date, batch_type, total_claims, total_amount, status, submission_date, completion_date, sha_batch_reference, created_by, invoice_generated, invoice_generated_at, printed_invoices, printed_at, printed_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sha_claim_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_claim_items (id, claim_id, service_type, service_code, service_description, service_date, quantity, unit_price, total_amount, sha_service_code, sha_service_category, sha_tariff_code, approved_quantity, approved_unit_price, approved_amount, rejection_reason, prescription_notes, treatment_notes, dosage_instructions, diagnosis_justification, provided_by, department, facility_level, is_emergency, requires_pre_authorization, pre_authorization_number, compliance_verified, verification_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sha_claims; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_claims (id, claim_number, patient_id, op_number, visit_id, patient_name, sha_beneficiary_id, national_id, phone_number, visit_date, primary_diagnosis_code, primary_diagnosis_description, secondary_diagnosis_codes, secondary_diagnosis_descriptions, provider_code, provider_name, facility_level, claim_amount, approved_amount, paid_amount, balance_variance, status, submission_date, approval_date, rejection_date, payment_date, sha_reference, sha_transaction_reference, sha_payment_reference, batch_id, rejection_reason, compliance_notes, requires_documents, documents_attached, last_reviewed_at, reviewed_by, created_by, submitted_by, approved_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sha_compliance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_compliance (id, claim_id, invoice_id, compliance_type, status, verification_date, verified_by, notes, required_actions, next_review_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sha_document_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_document_attachments (id, claim_id, invoice_id, document_type, document_name, document_description, file_path, file_size, mime_type, is_required, compliance_verified, verification_date, verification_notes, sha_document_reference, uploaded_by, uploaded_at, access_count, last_accessed_at, last_accessed_by, encryption_status, retention_period, deletion_scheduled_date, is_archived, archived_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sha_export_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_export_logs (id, export_type, export_scope, date_from, date_to, patient_ids, claim_statuses, invoice_ids, batch_ids, total_records, file_path, file_size, download_count, export_reason, audit_trail_reference, compliance_approved, approved_by, approval_date, exported_by, exported_at, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: sha_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_invoices (id, invoice_number, claim_id, patient_id, op_number, visit_id, invoice_date, due_date, total_amount, status, generated_at, generated_by, printed_at, printed_by, submitted_at, submitted_by, sha_reference, batch_reference, compliance_status, audit_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sha_submission_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_submission_logs (id, claim_id, batch_id, invoice_id, submission_type, submission_method, request_payload, response_payload, status, error_message, retry_count, next_retry_at, compliance_check, audit_notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sha_workflow_instances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_workflow_instances (id, claim_id, workflow_type, overall_status, current_step, total_steps, completed_steps, step_details, error_message, retry_count, max_retries, initiated_by, completed_by, initiated_at, completed_at, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sha_workflow_steps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sha_workflow_steps (id, workflow_id, step_name, step_order, step_type, status, input_data, output_data, error_message, started_at, completed_at, duration_ms, retry_count, max_retries, executed_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_adjustments (id, stock_item_id, adjustment_type, quantity_before, quantity_after, quantity_adjusted, reason, notes, adjusted_by, adjustment_date, approved_by, approval_date) FROM stdin;
\.


--
-- Data for Name: stock_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_alerts (id, stock_item_id, alert_type, current_stock, threshold_value, message, is_resolved, resolved_by, resolved_at, created_at) FROM stdin;
\.


--
-- Data for Name: stock_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_categories (id, name, description, parent_category_id, is_active, created_at, updated_at) FROM stdin;
e6846a47-fba3-41a6-a10b-60799430a3a1	MEDICATIONS	All types of medications and drugs	\N	t	2025-09-09 12:24:42.977	2025-09-09 12:24:42.977
a84e68e2-a99e-4e60-9032-38d2395132bf	MEDICAL_TOOLS	Medical instruments and tools	\N	t	2025-09-09 12:24:42.977	2025-09-09 12:24:42.977
0ee2a812-2660-460f-a62b-e6750a65e104	MEDICAL_EQUIPMENT	Medical equipment and devices	\N	t	2025-09-09 12:24:42.977	2025-09-09 12:24:42.977
0bdd3a44-bf1b-4882-8328-ebdd68ee7c8c	SUPPLIES	General medical supplies	\N	t	2025-09-09 12:24:42.977	2025-09-09 12:24:42.977
f6374c19-eb04-4012-bfba-fbd1968b377b	DIAGNOSTIC_SUPPLIES	Diagnostic and testing supplies	\N	t	2025-09-09 12:24:42.977	2025-09-09 12:24:42.977
f74a23a5-48c5-47b7-93cd-ad9b29cf8174	SURGICAL_SUPPLIES	Surgical instruments and supplies	\N	t	2025-09-09 12:24:42.977	2025-09-09 12:24:42.977
80d0f71c-ab19-471d-b725-8a5963ebd600	EMERGENCY_SUPPLIES	Emergency and first aid supplies	\N	t	2025-09-09 12:24:42.977	2025-09-09 12:24:42.977
d44b05b2-5bad-4b01-a9a9-1cbba013f075	CLEANING_SUPPLIES	Cleaning and sanitization supplies	\N	t	2025-09-09 12:24:42.977	2025-09-09 12:24:42.977
688d92c4-7344-456c-95a6-c93348ea1741	OFFICE_SUPPLIES	Office and administrative supplies	\N	t	2025-09-09 12:24:42.977	2025-09-09 12:24:42.977
2540832f-211f-483e-b5fd-c8e06b20882b	SYRINGES	Syringes and needles	a84e68e2-a99e-4e60-9032-38d2395132bf	t	2025-09-09 12:24:42.991693	2025-09-09 12:24:42.991693
55053505-29ed-4e73-bb0c-4df97e060a3a	SCALPELS	Scalpels and cutting instruments	a84e68e2-a99e-4e60-9032-38d2395132bf	t	2025-09-09 12:24:43.008662	2025-09-09 12:24:43.008662
d738e76e-5b6c-42ed-9a70-11b4ef7945be	FORCEPS	Forceps and grasping instruments	a84e68e2-a99e-4e60-9032-38d2395132bf	t	2025-09-09 12:24:43.024357	2025-09-09 12:24:43.024357
f11f1049-bb62-427d-a1a2-bb2cac905434	THERMOMETERS	Thermometers and temperature measuring devices	a84e68e2-a99e-4e60-9032-38d2395132bf	t	2025-09-09 12:24:43.039324	2025-09-09 12:24:43.039324
a33e3ccd-9a48-4685-a118-1fbdc571951c	STETHOSCOPES	Stethoscopes and listening devices	a84e68e2-a99e-4e60-9032-38d2395132bf	t	2025-09-09 12:24:43.053225	2025-09-09 12:24:43.053225
be2a9c08-6b2e-464e-9ada-7dbc120bf4d5	BLOOD_PRESSURE_MONITORS	Blood pressure monitoring equipment	0ee2a812-2660-460f-a62b-e6750a65e104	t	2025-09-09 12:24:43.067654	2025-09-09 12:24:43.067654
ac3db86f-cbc1-4e6c-b186-ed6883cac895	GLUCOSE_METERS	Glucose monitoring devices	0ee2a812-2660-460f-a62b-e6750a65e104	t	2025-09-09 12:24:43.081482	2025-09-09 12:24:43.081482
8cf9b043-fc09-47f0-9e94-acf4cd6f26d9	PULSE_OXIMETERS	Pulse oximetry devices	0ee2a812-2660-460f-a62b-e6750a65e104	t	2025-09-09 12:24:43.096298	2025-09-09 12:24:43.096298
ef0ffc4a-7358-4f23-b545-296635e9652b	WEIGHING_SCALES	Patient weighing scales	0ee2a812-2660-460f-a62b-e6750a65e104	t	2025-09-09 12:24:43.110104	2025-09-09 12:24:43.110104
bfb25e2c-6ed4-4276-8db1-b323859a40b2	BANDAGES	Bandages and wound care supplies	0bdd3a44-bf1b-4882-8328-ebdd68ee7c8c	t	2025-09-09 12:24:43.123429	2025-09-09 12:24:43.123429
e43b6a6f-17b4-4234-bd3f-12fc1a7b3bbf	GLOVES	Medical gloves and protective equipment	0bdd3a44-bf1b-4882-8328-ebdd68ee7c8c	t	2025-09-09 12:24:43.13707	2025-09-09 12:24:43.13707
ad4b8286-4cf6-4c72-8e09-204eea99392f	MASKS	Medical masks and respiratory protection	0bdd3a44-bf1b-4882-8328-ebdd68ee7c8c	t	2025-09-09 12:24:43.150355	2025-09-09 12:24:43.150355
16d7b2b0-2be8-4f74-b965-1c622260ca03	GAUZE	Gauze and dressing materials	0bdd3a44-bf1b-4882-8328-ebdd68ee7c8c	t	2025-09-09 12:24:43.163966	2025-09-09 12:24:43.163966
737922da-ef7a-4298-b02d-aa1b33607ce1	TEST_STRIPS	Diagnostic test strips	f6374c19-eb04-4012-bfba-fbd1968b377b	t	2025-09-09 12:24:43.177811	2025-09-09 12:24:43.177811
1149f452-3299-471c-a12b-03f285100ce9	LAB_TUBES	Laboratory test tubes and containers	f6374c19-eb04-4012-bfba-fbd1968b377b	t	2025-09-09 12:24:43.191529	2025-09-09 12:24:43.191529
edac8c58-e90f-40e9-9a64-df2a782b2da3	SWABS	Medical swabs and collection devices	f6374c19-eb04-4012-bfba-fbd1968b377b	t	2025-09-09 12:24:43.205354	2025-09-09 12:24:43.205354
\.


--
-- Data for Name: stock_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_items (id, name, description, category_id, sku, barcode, unit_of_measure, unit_price, cost_price, selling_price, minimum_stock_level, maximum_stock_level, current_stock, reorder_level, supplier_id, expiry_date, batch_number, location, is_active, is_controlled_substance, requires_prescription, created_at, updated_at, created_by, updated_by) FROM stdin;
14054364-e274-4387-a624-06b757fec6e8	Disposable Syringes 5ml	Sterile disposable syringes 5ml with needles	2540832f-211f-483e-b5fd-c8e06b20882b	SYR-5ML-001	\N	pieces	2.50	1.80	3.00	50	1000	200	75	\N	\N	\N	Storage Room A	t	f	f	2025-09-09 12:24:43.218918	2025-09-09 12:24:43.218918	550e8400-e29b-41d4-a716-446655440000	\N
965397e9-af21-4527-8daf-0ff20b07a6bf	Paracetamol 500mg Tablets	Paracetamol 500mg tablets, 100 tablets per box	e6846a47-fba3-41a6-a10b-60799430a3a1	MED-PAR-500-001	\N	boxes	15.00	12.00	18.00	10	1000	25	15	\N	\N	\N	Pharmacy Storage	t	f	t	2025-09-09 12:24:43.236496	2025-09-09 12:24:43.236496	550e8400-e29b-41d4-a716-446655440000	\N
c4dad24e-211e-4c83-8cfc-742b8a25b42e	Nitrile Gloves Medium	Disposable nitrile gloves, medium size, 100 pieces per box	e43b6a6f-17b4-4234-bd3f-12fc1a7b3bbf	GLO-NIT-M-001	\N	boxes	8.00	6.00	10.00	20	1000	45	30	\N	\N	\N	Supply Room	t	f	f	2025-09-09 12:24:43.251102	2025-09-09 12:24:43.251102	550e8400-e29b-41d4-a716-446655440000	\N
87392432-b3c0-42df-90c6-4a720e9fc271	Digital Thermometer	Digital oral/rectal thermometer with LCD display	f11f1049-bb62-427d-a1a2-bb2cac905434	THR-DIG-001	\N	pieces	25.00	18.00	30.00	5	1000	8	7	\N	\N	\N	Equipment Room	t	f	f	2025-09-09 12:24:43.26543	2025-09-09 12:24:43.26543	550e8400-e29b-41d4-a716-446655440000	\N
ea71fa13-d754-4a2b-b9f7-3b69d9f9adbf	Blood Pressure Cuff	Standard adult blood pressure cuff for manual BP measurement	be2a9c08-6b2e-464e-9ada-7dbc120bf4d5	BP-CUFF-ADULT-001	\N	pieces	35.00	25.00	45.00	3	1000	5	4	\N	\N	\N	Equipment Room	t	f	f	2025-09-09 12:24:43.279982	2025-09-09 12:24:43.279982	550e8400-e29b-41d4-a716-446655440000	\N
8676dc96-7ca6-4f21-86e9-5e9d441dcd97	Test Syringe 10ml	Test disposable syringe for stock management	be2a9c08-6b2e-464e-9ada-7dbc120bf4d5	TEST-SYR-10ML-001	\N	pieces	3.75	2.50	4.00	20	500	150	30	\N	\N	\N	Test Storage Room	f	f	f	2025-09-09 12:28:33.065618	2025-09-09 12:28:33.17503	550e8400-e29b-41d4-a716-446655440000	550e8400-e29b-41d4-a716-446655440000
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_movements (id, stock_item_id, movement_type, quantity, unit_price, total_value, reference_type, reference_id, reason, batch_number, expiry_date, location_from, location_to, performed_by, movement_date, notes) FROM stdin;
\.


--
-- Data for Name: stock_purchase_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_purchase_items (id, purchase_id, stock_item_id, quantity_ordered, quantity_received, unit_cost, total_cost, expiry_date, batch_number, notes) FROM stdin;
\.


--
-- Data for Name: stock_purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_purchases (id, purchase_number, supplier_id, purchase_date, expected_delivery_date, actual_delivery_date, total_amount, status, notes, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_request_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_request_items (id, stock_request_id, stock_item_id, requested_quantity, approved_quantity, fulfilled_quantity, unit_price, total_cost, notes) FROM stdin;
\.


--
-- Data for Name: stock_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_requests (id, requested_by, requested_for, request_type, priority, status, request_date, required_date, notes, approved_by, approval_date, fulfilled_by, fulfillment_date) FROM stdin;
\.


--
-- Data for Name: stock_suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_suppliers (id, name, contact_person, email, phone, address, city, country, payment_terms, delivery_terms, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_presence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_presence (id, user_id, status, last_seen, current_page, current_activity, is_typing, typing_entity_id, typing_entity_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_sessions (id, user_id, refresh_token, expires_at, ip_address, user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password_hash, role, is_active, is_locked, failed_login_attempts, last_login_at, totp_secret, created_at, updated_at) FROM stdin;
550e8400-e29b-41d4-a716-446655440000	admin	admin@sethclinic.com	$2b$10$ne44avY8jWIesS5fYVPmxucYS0VqqaW2HNn251pTBL7.4SqEF2JKq	ADMIN	t	f	0	2025-09-13 15:41:32.461871	\N	2025-09-03 19:12:45.81926	2025-09-13 15:41:32.461871
46ee6906-b345-4754-a91a-1b77891d162f	reception	reception@clinic.com	$2b$12$dNThhyGlr2KUU3g1MVuwieKSqSW.sjoTww/Ui.k0La4vYTdTuwip.	RECEPTIONIST	t	f	0	\N	\N	2025-09-13 18:03:27.178425	2025-09-13 18:03:27.178425
bd8125b5-aa95-40d1-b85e-b8746953f568	nurse	nurse@clinic.com	$2b$12$tTBzG.wM1bXrsBWYA1KZm.ByQWfd9AiXw2HjnQikoJhIiw0CTkULG	NURSE	t	f	0	\N	\N	2025-09-13 18:03:37.397192	2025-09-13 18:03:37.397192
b76277d8-f21d-418c-a5bc-56f24782c691	doctor	doctor@clinic.com	$2b$12$f3D7GmVelkPLluf.NPUJxuzt5XdxjGVaal3m.1UJpb.1t36vtXv/a	CLINICAL_OFFICER	t	f	0	\N	\N	2025-09-13 18:03:47.635575	2025-09-13 18:03:47.635575
196a2147-66cb-4683-8a83-8438fc9a95ac	pharmacy	pharmacy@clinic.com	$2b$12$jscBHMnUzJnZnEj8wwq.QOFQANwawSKLtEu0jX8sgQQztDIZOssgq	PHARMACIST	t	f	0	\N	\N	2025-09-13 18:05:13.805964	2025-09-13 18:05:13.805964
\.


--
-- Data for Name: visits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.visits (id, patient_id, op_number, visit_date, status, chief_complaint, triage_category, created_at, updated_at, payment_type, payment_reference) FROM stdin;
59f53dfb-acd1-4440-a8a6-1fde215f7993	e2dfb57c-e728-48fc-aaf8-636177bf3c5e	OP-2025-004	2025-09-09	REGISTERED	Test visit for payment type	NORMAL	2025-09-09 11:49:53.340165	2025-09-09 11:49:53.340165	\N	\N
\.


--
-- Data for Name: vitals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vitals (id, visit_id, temperature, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation, weight, height, bmi, recorded_by, recorded_at) FROM stdin;
\.


--
-- Name: accounts_receivable accounts_receivable_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: cash_reconciliations cash_reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_reconciliations
    ADD CONSTRAINT cash_reconciliations_pkey PRIMARY KEY (id);


--
-- Name: clinical_diagnosis_codes clinical_diagnosis_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_diagnosis_codes
    ADD CONSTRAINT clinical_diagnosis_codes_code_key UNIQUE (code);


--
-- Name: clinical_diagnosis_codes clinical_diagnosis_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_diagnosis_codes
    ADD CONSTRAINT clinical_diagnosis_codes_pkey PRIMARY KEY (id);


--
-- Name: clinical_lab_tests clinical_lab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_lab_tests
    ADD CONSTRAINT clinical_lab_tests_pkey PRIMARY KEY (id);


--
-- Name: clinical_lab_tests clinical_lab_tests_test_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_lab_tests
    ADD CONSTRAINT clinical_lab_tests_test_code_key UNIQUE (test_code);


--
-- Name: clinical_medications clinical_medications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_medications
    ADD CONSTRAINT clinical_medications_pkey PRIMARY KEY (id);


--
-- Name: clinical_procedures clinical_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_procedures
    ADD CONSTRAINT clinical_procedures_pkey PRIMARY KEY (id);


--
-- Name: clinical_procedures clinical_procedures_procedure_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_procedures
    ADD CONSTRAINT clinical_procedures_procedure_code_key UNIQUE (procedure_code);


--
-- Name: clinical_symptoms clinical_symptoms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinical_symptoms
    ADD CONSTRAINT clinical_symptoms_pkey PRIMARY KEY (id);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


--
-- Name: currency_config currency_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currency_config
    ADD CONSTRAINT currency_config_pkey PRIMARY KEY (id);


--
-- Name: event_logs event_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_logs
    ADD CONSTRAINT event_logs_pkey PRIMARY KEY (id);


--
-- Name: family_planning_methods family_planning_methods_method_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_planning_methods
    ADD CONSTRAINT family_planning_methods_method_code_key UNIQUE (method_code);


--
-- Name: family_planning_methods family_planning_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.family_planning_methods
    ADD CONSTRAINT family_planning_methods_pkey PRIMARY KEY (id);


--
-- Name: immunization_schedule_vaccines immunization_schedule_vaccines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_schedule_vaccines
    ADD CONSTRAINT immunization_schedule_vaccines_pkey PRIMARY KEY (id);


--
-- Name: immunization_schedule_vaccines immunization_schedule_vaccines_schedule_id_vaccine_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_schedule_vaccines
    ADD CONSTRAINT immunization_schedule_vaccines_schedule_id_vaccine_id_key UNIQUE (schedule_id, vaccine_id);


--
-- Name: immunization_schedules immunization_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_schedules
    ADD CONSTRAINT immunization_schedules_pkey PRIMARY KEY (id);


--
-- Name: immunization_vaccines immunization_vaccines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_vaccines
    ADD CONSTRAINT immunization_vaccines_pkey PRIMARY KEY (id);


--
-- Name: immunization_vaccines immunization_vaccines_vaccine_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_vaccines
    ADD CONSTRAINT immunization_vaccines_vaccine_code_key UNIQUE (vaccine_code);


--
-- Name: inventory_batches inventory_batches_inventory_item_id_batch_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_batches
    ADD CONSTRAINT inventory_batches_inventory_item_id_batch_number_key UNIQUE (inventory_item_id, batch_number);


--
-- Name: inventory_batches inventory_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_batches
    ADD CONSTRAINT inventory_batches_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: lab_requests lab_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_pkey PRIMARY KEY (id);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: mch_services mch_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mch_services
    ADD CONSTRAINT mch_services_pkey PRIMARY KEY (id);


--
-- Name: mch_services mch_services_service_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mch_services
    ADD CONSTRAINT mch_services_service_code_key UNIQUE (service_code);


--
-- Name: migration_jobs migration_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migration_jobs
    ADD CONSTRAINT migration_jobs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: patient_assignments patient_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_assignments
    ADD CONSTRAINT patient_assignments_pkey PRIMARY KEY (id);


--
-- Name: patient_encounters patient_encounters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_encounters
    ADD CONSTRAINT patient_encounters_pkey PRIMARY KEY (id);


--
-- Name: patient_family_planning patient_family_planning_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_family_planning
    ADD CONSTRAINT patient_family_planning_pkey PRIMARY KEY (id);


--
-- Name: patient_immunizations patient_immunizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_immunizations
    ADD CONSTRAINT patient_immunizations_pkey PRIMARY KEY (id);


--
-- Name: patient_mch_services patient_mch_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_mch_services
    ADD CONSTRAINT patient_mch_services_pkey PRIMARY KEY (id);


--
-- Name: patients patients_op_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_op_number_key UNIQUE (op_number);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: prescription_items prescription_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_name_key UNIQUE (name);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: sha_audit_trail sha_audit_trail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_audit_trail
    ADD CONSTRAINT sha_audit_trail_pkey PRIMARY KEY (id);


--
-- Name: sha_claim_batches sha_claim_batches_batch_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claim_batches
    ADD CONSTRAINT sha_claim_batches_batch_number_key UNIQUE (batch_number);


--
-- Name: sha_claim_batches sha_claim_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claim_batches
    ADD CONSTRAINT sha_claim_batches_pkey PRIMARY KEY (id);


--
-- Name: sha_claim_items sha_claim_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claim_items
    ADD CONSTRAINT sha_claim_items_pkey PRIMARY KEY (id);


--
-- Name: sha_claims sha_claims_claim_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claims
    ADD CONSTRAINT sha_claims_claim_number_key UNIQUE (claim_number);


--
-- Name: sha_claims sha_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claims
    ADD CONSTRAINT sha_claims_pkey PRIMARY KEY (id);


--
-- Name: sha_compliance sha_compliance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_compliance
    ADD CONSTRAINT sha_compliance_pkey PRIMARY KEY (id);


--
-- Name: sha_document_attachments sha_document_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_document_attachments
    ADD CONSTRAINT sha_document_attachments_pkey PRIMARY KEY (id);


--
-- Name: sha_export_logs sha_export_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_export_logs
    ADD CONSTRAINT sha_export_logs_pkey PRIMARY KEY (id);


--
-- Name: sha_invoices sha_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_invoices
    ADD CONSTRAINT sha_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: sha_invoices sha_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_invoices
    ADD CONSTRAINT sha_invoices_pkey PRIMARY KEY (id);


--
-- Name: sha_submission_logs sha_submission_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_submission_logs
    ADD CONSTRAINT sha_submission_logs_pkey PRIMARY KEY (id);


--
-- Name: sha_workflow_instances sha_workflow_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_workflow_instances
    ADD CONSTRAINT sha_workflow_instances_pkey PRIMARY KEY (id);


--
-- Name: sha_workflow_steps sha_workflow_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_workflow_steps
    ADD CONSTRAINT sha_workflow_steps_pkey PRIMARY KEY (id);


--
-- Name: stock_adjustments stock_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_pkey PRIMARY KEY (id);


--
-- Name: stock_alerts stock_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_pkey PRIMARY KEY (id);


--
-- Name: stock_categories stock_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_categories
    ADD CONSTRAINT stock_categories_name_key UNIQUE (name);


--
-- Name: stock_categories stock_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_categories
    ADD CONSTRAINT stock_categories_pkey PRIMARY KEY (id);


--
-- Name: stock_items stock_items_barcode_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_barcode_key UNIQUE (barcode);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: stock_items stock_items_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_sku_key UNIQUE (sku);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock_purchase_items stock_purchase_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_purchase_items
    ADD CONSTRAINT stock_purchase_items_pkey PRIMARY KEY (id);


--
-- Name: stock_purchases stock_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_purchases
    ADD CONSTRAINT stock_purchases_pkey PRIMARY KEY (id);


--
-- Name: stock_purchases stock_purchases_purchase_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_purchases
    ADD CONSTRAINT stock_purchases_purchase_number_key UNIQUE (purchase_number);


--
-- Name: stock_request_items stock_request_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_request_items
    ADD CONSTRAINT stock_request_items_pkey PRIMARY KEY (id);


--
-- Name: stock_requests stock_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_requests
    ADD CONSTRAINT stock_requests_pkey PRIMARY KEY (id);


--
-- Name: stock_suppliers stock_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_suppliers
    ADD CONSTRAINT stock_suppliers_pkey PRIMARY KEY (id);


--
-- Name: currency_config unique_active_currency; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currency_config
    ADD CONSTRAINT unique_active_currency UNIQUE (is_active) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: user_presence user_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_pkey PRIMARY KEY (id);


--
-- Name: user_presence user_presence_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_key UNIQUE (user_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: vitals vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_op_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_op_number ON public.audit_logs USING btree (op_number);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_clinical_diagnosis_codes_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_diagnosis_codes_active ON public.clinical_diagnosis_codes USING btree (is_active);


--
-- Name: idx_clinical_diagnosis_codes_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_diagnosis_codes_category ON public.clinical_diagnosis_codes USING btree (category);


--
-- Name: idx_clinical_diagnosis_codes_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_diagnosis_codes_code ON public.clinical_diagnosis_codes USING btree (code);


--
-- Name: idx_clinical_diagnosis_codes_description; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_diagnosis_codes_description ON public.clinical_diagnosis_codes USING gin (to_tsvector('english'::regconfig, description));


--
-- Name: idx_clinical_diagnosis_codes_keywords; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_diagnosis_codes_keywords ON public.clinical_diagnosis_codes USING gin (search_keywords);


--
-- Name: idx_clinical_diagnosis_codes_usage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_diagnosis_codes_usage ON public.clinical_diagnosis_codes USING btree (usage_count DESC);


--
-- Name: idx_clinical_lab_tests_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_lab_tests_active ON public.clinical_lab_tests USING btree (is_active);


--
-- Name: idx_clinical_lab_tests_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_lab_tests_category ON public.clinical_lab_tests USING btree (test_category);


--
-- Name: idx_clinical_lab_tests_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_lab_tests_code ON public.clinical_lab_tests USING btree (test_code);


--
-- Name: idx_clinical_lab_tests_keywords; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_lab_tests_keywords ON public.clinical_lab_tests USING gin (search_keywords);


--
-- Name: idx_clinical_lab_tests_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_lab_tests_name ON public.clinical_lab_tests USING gin (to_tsvector('english'::regconfig, (test_name)::text));


--
-- Name: idx_clinical_lab_tests_usage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_lab_tests_usage ON public.clinical_lab_tests USING btree (usage_count DESC);


--
-- Name: idx_clinical_medications_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_medications_active ON public.clinical_medications USING btree (is_active);


--
-- Name: idx_clinical_medications_generic; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_medications_generic ON public.clinical_medications USING gin (to_tsvector('english'::regconfig, (generic_name)::text));


--
-- Name: idx_clinical_medications_keywords; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_medications_keywords ON public.clinical_medications USING gin (search_keywords);


--
-- Name: idx_clinical_medications_usage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_medications_usage ON public.clinical_medications USING btree (usage_count DESC);


--
-- Name: idx_clinical_procedures_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_procedures_active ON public.clinical_procedures USING btree (is_active);


--
-- Name: idx_clinical_procedures_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_procedures_category ON public.clinical_procedures USING btree (procedure_category);


--
-- Name: idx_clinical_procedures_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_procedures_code ON public.clinical_procedures USING btree (procedure_code);


--
-- Name: idx_clinical_procedures_keywords; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_procedures_keywords ON public.clinical_procedures USING gin (search_keywords);


--
-- Name: idx_clinical_procedures_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_procedures_name ON public.clinical_procedures USING gin (to_tsvector('english'::regconfig, (procedure_name)::text));


--
-- Name: idx_clinical_procedures_usage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_procedures_usage ON public.clinical_procedures USING btree (usage_count DESC);


--
-- Name: idx_clinical_symptoms_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_symptoms_active ON public.clinical_symptoms USING btree (is_active);


--
-- Name: idx_clinical_symptoms_keywords; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_symptoms_keywords ON public.clinical_symptoms USING gin (search_keywords);


--
-- Name: idx_clinical_symptoms_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_symptoms_name ON public.clinical_symptoms USING gin (to_tsvector('english'::regconfig, (symptom_name)::text));


--
-- Name: idx_clinical_symptoms_usage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinical_symptoms_usage ON public.clinical_symptoms USING btree (usage_count DESC);


--
-- Name: idx_event_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_logs_action ON public.event_logs USING btree (action);


--
-- Name: idx_event_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_logs_created_at ON public.event_logs USING btree (created_at);


--
-- Name: idx_event_logs_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_logs_event_type ON public.event_logs USING btree (event_type);


--
-- Name: idx_event_logs_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_logs_severity ON public.event_logs USING btree (severity);


--
-- Name: idx_event_logs_target_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_logs_target_type ON public.event_logs USING btree (target_type);


--
-- Name: idx_event_logs_type_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_logs_type_created ON public.event_logs USING btree (event_type, created_at);


--
-- Name: idx_event_logs_type_severity_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_logs_type_severity_created ON public.event_logs USING btree (event_type, severity, created_at);


--
-- Name: idx_event_logs_user_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_logs_user_action ON public.event_logs USING btree (user_id, action);


--
-- Name: idx_event_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_logs_user_id ON public.event_logs USING btree (user_id);


--
-- Name: idx_inventory_batches_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_batches_expiry ON public.inventory_batches USING btree (expiry_date);


--
-- Name: idx_inventory_batches_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_batches_item_id ON public.inventory_batches USING btree (inventory_item_id);


--
-- Name: idx_invoices_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_patient_id ON public.invoices USING btree (patient_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_priority ON public.notifications USING btree (priority);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_priority ON public.notifications USING btree (user_id, priority);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_notifications_user_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_type ON public.notifications USING btree (user_id, type);


--
-- Name: idx_patient_assignments_assigned_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_assigned_by ON public.patient_assignments USING btree (assigned_by_user_id);


--
-- Name: idx_patient_assignments_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_assigned_to ON public.patient_assignments USING btree (assigned_to_user_id);


--
-- Name: idx_patient_assignments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_created_at ON public.patient_assignments USING btree (created_at);


--
-- Name: idx_patient_assignments_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_due_date ON public.patient_assignments USING btree (due_date);


--
-- Name: idx_patient_assignments_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_patient_id ON public.patient_assignments USING btree (patient_id);


--
-- Name: idx_patient_assignments_patient_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_patient_status ON public.patient_assignments USING btree (patient_id, status);


--
-- Name: idx_patient_assignments_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_priority ON public.patient_assignments USING btree (priority);


--
-- Name: idx_patient_assignments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_status ON public.patient_assignments USING btree (status);


--
-- Name: idx_patient_assignments_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_type ON public.patient_assignments USING btree (assignment_type);


--
-- Name: idx_patient_assignments_type_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_type_status ON public.patient_assignments USING btree (assignment_type, status);


--
-- Name: idx_patient_assignments_user_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_assignments_user_status ON public.patient_assignments USING btree (assigned_to_user_id, status);


--
-- Name: idx_patient_encounters_completion; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_encounters_completion ON public.patient_encounters USING btree (completion_date);


--
-- Name: idx_patient_encounters_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_encounters_date ON public.patient_encounters USING btree (encounter_date);


--
-- Name: idx_patient_encounters_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_encounters_patient ON public.patient_encounters USING btree (patient_id);


--
-- Name: idx_patient_encounters_payment_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_encounters_payment_type ON public.patient_encounters USING btree (payment_type);


--
-- Name: idx_patient_encounters_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_encounters_provider ON public.patient_encounters USING btree (primary_provider);


--
-- Name: idx_patient_encounters_sha_eligible; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_encounters_sha_eligible ON public.patient_encounters USING btree (sha_eligible);


--
-- Name: idx_patient_encounters_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_encounters_status ON public.patient_encounters USING btree (status);


--
-- Name: idx_patient_encounters_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_encounters_type ON public.patient_encounters USING btree (encounter_type);


--
-- Name: idx_patient_encounters_visit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_encounters_visit ON public.patient_encounters USING btree (visit_id);


--
-- Name: idx_patient_family_planning_method_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_family_planning_method_id ON public.patient_family_planning USING btree (method_id);


--
-- Name: idx_patient_family_planning_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_family_planning_patient_id ON public.patient_family_planning USING btree (patient_id);


--
-- Name: idx_patient_family_planning_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_family_planning_status ON public.patient_family_planning USING btree (status);


--
-- Name: idx_patient_immunizations_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_immunizations_date ON public.patient_immunizations USING btree (immunization_date);


--
-- Name: idx_patient_immunizations_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_immunizations_patient_id ON public.patient_immunizations USING btree (patient_id);


--
-- Name: idx_patient_immunizations_vaccine_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_immunizations_vaccine_id ON public.patient_immunizations USING btree (vaccine_id);


--
-- Name: idx_patient_mch_services_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_mch_services_date ON public.patient_mch_services USING btree (service_date);


--
-- Name: idx_patient_mch_services_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_mch_services_patient_id ON public.patient_mch_services USING btree (patient_id);


--
-- Name: idx_patient_mch_services_service_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patient_mch_services_service_id ON public.patient_mch_services USING btree (service_id);


--
-- Name: idx_patients_op_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_op_number ON public.patients USING btree (op_number);


--
-- Name: idx_payments_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_invoice_id ON public.payments USING btree (invoice_id);


--
-- Name: idx_sha_audit_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_audit_action ON public.sha_audit_trail USING btree (action);


--
-- Name: idx_sha_audit_claim; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_audit_claim ON public.sha_audit_trail USING btree (claim_id);


--
-- Name: idx_sha_audit_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_audit_date ON public.sha_audit_trail USING btree (performed_at);


--
-- Name: idx_sha_audit_invoice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_audit_invoice ON public.sha_audit_trail USING btree (invoice_id);


--
-- Name: idx_sha_audit_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_audit_user ON public.sha_audit_trail USING btree (performed_by);


--
-- Name: idx_sha_batches_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_batches_date ON public.sha_claim_batches USING btree (batch_date);


--
-- Name: idx_sha_batches_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_batches_number ON public.sha_claim_batches USING btree (batch_number);


--
-- Name: idx_sha_batches_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_batches_status ON public.sha_claim_batches USING btree (status);


--
-- Name: idx_sha_batches_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_batches_type ON public.sha_claim_batches USING btree (batch_type);


--
-- Name: idx_sha_claim_items_department; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_claim_items_department ON public.sha_claim_items USING btree (department);


--
-- Name: idx_sha_claim_items_emergency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_claim_items_emergency ON public.sha_claim_items USING btree (is_emergency);


--
-- Name: idx_sha_claim_items_provided_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_claim_items_provided_by ON public.sha_claim_items USING btree (provided_by);


--
-- Name: idx_sha_claim_items_service_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_claim_items_service_date ON public.sha_claim_items USING btree (service_date);


--
-- Name: idx_sha_claims_beneficiary; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_claims_beneficiary ON public.sha_claims USING btree (sha_beneficiary_id);


--
-- Name: idx_sha_claims_facility_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_claims_facility_level ON public.sha_claims USING btree (facility_level);


--
-- Name: idx_sha_claims_national_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_claims_national_id ON public.sha_claims USING btree (national_id);


--
-- Name: idx_sha_claims_provider_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_claims_provider_code ON public.sha_claims USING btree (provider_code);


--
-- Name: idx_sha_claims_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_claims_status ON public.sha_claims USING btree (status);


--
-- Name: idx_sha_claims_visit_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_claims_visit_date ON public.sha_claims USING btree (visit_date);


--
-- Name: idx_sha_compliance_claim; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_compliance_claim ON public.sha_compliance USING btree (claim_id);


--
-- Name: idx_sha_compliance_invoice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_compliance_invoice ON public.sha_compliance USING btree (invoice_id);


--
-- Name: idx_sha_compliance_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_compliance_status ON public.sha_compliance USING btree (status);


--
-- Name: idx_sha_compliance_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_compliance_type ON public.sha_compliance USING btree (compliance_type);


--
-- Name: idx_sha_documents_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_documents_claim_id ON public.sha_document_attachments USING btree (claim_id);


--
-- Name: idx_sha_documents_required; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_documents_required ON public.sha_document_attachments USING btree (is_required);


--
-- Name: idx_sha_documents_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_documents_type ON public.sha_document_attachments USING btree (document_type);


--
-- Name: idx_sha_documents_uploaded_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_documents_uploaded_at ON public.sha_document_attachments USING btree (uploaded_at);


--
-- Name: idx_sha_documents_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_documents_uploaded_by ON public.sha_document_attachments USING btree (uploaded_by);


--
-- Name: idx_sha_exports_date_from; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_exports_date_from ON public.sha_export_logs USING btree (date_from);


--
-- Name: idx_sha_exports_date_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_exports_date_to ON public.sha_export_logs USING btree (date_to);


--
-- Name: idx_sha_exports_exported_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_exports_exported_at ON public.sha_export_logs USING btree (exported_at);


--
-- Name: idx_sha_exports_exported_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_exports_exported_by ON public.sha_export_logs USING btree (exported_by);


--
-- Name: idx_sha_exports_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_exports_scope ON public.sha_export_logs USING btree (export_scope);


--
-- Name: idx_sha_exports_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_exports_type ON public.sha_export_logs USING btree (export_type);


--
-- Name: idx_sha_invoices_claim; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_invoices_claim ON public.sha_invoices USING btree (claim_id);


--
-- Name: idx_sha_invoices_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_invoices_date ON public.sha_invoices USING btree (invoice_date);


--
-- Name: idx_sha_invoices_due_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_invoices_due_date ON public.sha_invoices USING btree (due_date);


--
-- Name: idx_sha_invoices_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_invoices_number ON public.sha_invoices USING btree (invoice_number);


--
-- Name: idx_sha_invoices_patient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_invoices_patient ON public.sha_invoices USING btree (patient_id);


--
-- Name: idx_sha_invoices_sha_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_invoices_sha_ref ON public.sha_invoices USING btree (sha_reference);


--
-- Name: idx_sha_invoices_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_invoices_status ON public.sha_invoices USING btree (status);


--
-- Name: idx_sha_submission_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_submission_batch ON public.sha_submission_logs USING btree (batch_id);


--
-- Name: idx_sha_submission_claim; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_submission_claim ON public.sha_submission_logs USING btree (claim_id);


--
-- Name: idx_sha_submission_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_submission_date ON public.sha_submission_logs USING btree (created_at);


--
-- Name: idx_sha_submission_invoice; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_submission_invoice ON public.sha_submission_logs USING btree (invoice_id);


--
-- Name: idx_sha_submission_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_submission_status ON public.sha_submission_logs USING btree (status);


--
-- Name: idx_sha_workflow_instances_claim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_workflow_instances_claim_id ON public.sha_workflow_instances USING btree (claim_id);


--
-- Name: idx_sha_workflow_instances_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_workflow_instances_created_at ON public.sha_workflow_instances USING btree (created_at);


--
-- Name: idx_sha_workflow_instances_initiated_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_workflow_instances_initiated_by ON public.sha_workflow_instances USING btree (initiated_by);


--
-- Name: idx_sha_workflow_instances_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_workflow_instances_status ON public.sha_workflow_instances USING btree (overall_status);


--
-- Name: idx_sha_workflow_steps_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_workflow_steps_status ON public.sha_workflow_steps USING btree (status);


--
-- Name: idx_sha_workflow_steps_step_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_workflow_steps_step_order ON public.sha_workflow_steps USING btree (step_order);


--
-- Name: idx_sha_workflow_steps_workflow_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sha_workflow_steps_workflow_id ON public.sha_workflow_steps USING btree (workflow_id);


--
-- Name: idx_stock_adjustments_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_adjustments_item ON public.stock_adjustments USING btree (stock_item_id);


--
-- Name: idx_stock_alerts_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_alerts_item ON public.stock_alerts USING btree (stock_item_id);


--
-- Name: idx_stock_alerts_resolved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_alerts_resolved ON public.stock_alerts USING btree (is_resolved);


--
-- Name: idx_stock_categories_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_categories_parent ON public.stock_categories USING btree (parent_category_id);


--
-- Name: idx_stock_items_barcode; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_items_barcode ON public.stock_items USING btree (barcode);


--
-- Name: idx_stock_items_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_items_category ON public.stock_items USING btree (category_id);


--
-- Name: idx_stock_items_current_stock; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_items_current_stock ON public.stock_items USING btree (current_stock);


--
-- Name: idx_stock_items_reorder_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_items_reorder_level ON public.stock_items USING btree (reorder_level);


--
-- Name: idx_stock_items_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_items_sku ON public.stock_items USING btree (sku);


--
-- Name: idx_stock_movements_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_date ON public.stock_movements USING btree (movement_date);


--
-- Name: idx_stock_movements_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_item ON public.stock_movements USING btree (stock_item_id);


--
-- Name: idx_stock_movements_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_movements_type ON public.stock_movements USING btree (movement_type);


--
-- Name: idx_stock_requests_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_requests_date ON public.stock_requests USING btree (request_date);


--
-- Name: idx_stock_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_stock_requests_status ON public.stock_requests USING btree (status);


--
-- Name: idx_user_presence_current_activity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_presence_current_activity ON public.user_presence USING btree (current_activity);


--
-- Name: idx_user_presence_current_page; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_presence_current_page ON public.user_presence USING btree (current_page);


--
-- Name: idx_user_presence_is_typing; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_presence_is_typing ON public.user_presence USING btree (is_typing);


--
-- Name: idx_user_presence_last_seen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_presence_last_seen ON public.user_presence USING btree (last_seen);


--
-- Name: idx_user_presence_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_presence_status ON public.user_presence USING btree (status);


--
-- Name: idx_user_presence_status_last_seen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_presence_status_last_seen ON public.user_presence USING btree (status, last_seen);


--
-- Name: idx_user_presence_typing_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_presence_typing_entity ON public.user_presence USING btree (typing_entity_id, typing_entity_type);


--
-- Name: idx_user_presence_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_presence_user_id ON public.user_presence USING btree (user_id);


--
-- Name: idx_user_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_visits_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visits_date ON public.visits USING btree (visit_date);


--
-- Name: idx_visits_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visits_patient_id ON public.visits USING btree (patient_id);


--
-- Name: idx_visits_payment_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visits_payment_type ON public.visits USING btree (payment_type);


--
-- Name: idx_visits_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_visits_status ON public.visits USING btree (status);


--
-- Name: stock_items check_low_stock_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_low_stock_trigger AFTER UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.check_low_stock();


--
-- Name: accounts_receivable update_accounts_receivable_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clinical_diagnosis_codes update_clinical_diagnosis_codes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clinical_diagnosis_codes_updated_at BEFORE UPDATE ON public.clinical_diagnosis_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clinical_lab_tests update_clinical_lab_tests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clinical_lab_tests_updated_at BEFORE UPDATE ON public.clinical_lab_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clinical_medications update_clinical_medications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clinical_medications_updated_at BEFORE UPDATE ON public.clinical_medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clinical_procedures update_clinical_procedures_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clinical_procedures_updated_at BEFORE UPDATE ON public.clinical_procedures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clinical_symptoms update_clinical_symptoms_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clinical_symptoms_updated_at BEFORE UPDATE ON public.clinical_symptoms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consultations update_consultations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: family_planning_methods update_family_planning_methods_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_family_planning_methods_updated_at BEFORE UPDATE ON public.family_planning_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: immunization_schedules update_immunization_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_immunization_schedules_updated_at BEFORE UPDATE ON public.immunization_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: immunization_vaccines update_immunization_vaccines_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_immunization_vaccines_updated_at BEFORE UPDATE ON public.immunization_vaccines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_batches update_inventory_batches_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inventory_batches_updated_at BEFORE UPDATE ON public.inventory_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_items update_inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lab_requests update_lab_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_lab_requests_updated_at BEFORE UPDATE ON public.lab_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mch_services update_mch_services_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_mch_services_updated_at BEFORE UPDATE ON public.mch_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_notifications_updated_at();


--
-- Name: patient_assignments update_patient_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_patient_assignments_updated_at BEFORE UPDATE ON public.patient_assignments FOR EACH ROW EXECUTE FUNCTION public.update_patient_assignments_updated_at();


--
-- Name: patient_encounters update_patient_encounters_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_patient_encounters_updated_at BEFORE UPDATE ON public.patient_encounters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patient_family_planning update_patient_family_planning_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_patient_family_planning_updated_at BEFORE UPDATE ON public.patient_family_planning FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patient_immunizations update_patient_immunizations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_patient_immunizations_updated_at BEFORE UPDATE ON public.patient_immunizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patient_mch_services update_patient_mch_services_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_patient_mch_services_updated_at BEFORE UPDATE ON public.patient_mch_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patients update_patients_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prescriptions update_prescriptions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: service_categories update_service_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON public.service_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sha_claim_batches update_sha_claim_batches_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sha_claim_batches_updated_at BEFORE UPDATE ON public.sha_claim_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sha_claim_items update_sha_claim_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sha_claim_items_updated_at BEFORE UPDATE ON public.sha_claim_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sha_claims update_sha_claims_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sha_claims_updated_at BEFORE UPDATE ON public.sha_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sha_compliance update_sha_compliance_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sha_compliance_updated_at BEFORE UPDATE ON public.sha_compliance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sha_document_attachments update_sha_document_attachments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sha_document_attachments_updated_at BEFORE UPDATE ON public.sha_document_attachments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sha_invoices update_sha_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sha_invoices_updated_at BEFORE UPDATE ON public.sha_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sha_submission_logs update_sha_submission_logs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sha_submission_logs_updated_at BEFORE UPDATE ON public.sha_submission_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sha_workflow_instances update_sha_workflow_instances_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sha_workflow_instances_updated_at BEFORE UPDATE ON public.sha_workflow_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sha_workflow_steps update_sha_workflow_steps_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sha_workflow_steps_updated_at BEFORE UPDATE ON public.sha_workflow_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_categories update_stock_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_stock_categories_updated_at BEFORE UPDATE ON public.stock_categories FOR EACH ROW EXECUTE FUNCTION public.update_stock_updated_at();


--
-- Name: stock_items update_stock_items_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_stock_items_updated_at BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.update_stock_updated_at();


--
-- Name: stock_movements update_stock_levels_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_stock_levels_trigger AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.update_stock_levels();


--
-- Name: stock_purchases update_stock_purchases_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_stock_purchases_updated_at BEFORE UPDATE ON public.stock_purchases FOR EACH ROW EXECUTE FUNCTION public.update_stock_updated_at();


--
-- Name: stock_suppliers update_stock_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_stock_suppliers_updated_at BEFORE UPDATE ON public.stock_suppliers FOR EACH ROW EXECUTE FUNCTION public.update_stock_updated_at();


--
-- Name: user_presence update_user_presence_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON public.user_presence FOR EACH ROW EXECUTE FUNCTION public.update_user_presence_updated_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: visits update_visits_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounts_receivable accounts_receivable_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: accounts_receivable accounts_receivable_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cash_reconciliations cash_reconciliations_reconciled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_reconciliations
    ADD CONSTRAINT cash_reconciliations_reconciled_by_fkey FOREIGN KEY (reconciled_by) REFERENCES public.users(id);


--
-- Name: consultations consultations_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES public.users(id);


--
-- Name: consultations consultations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: consultations consultations_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: event_logs event_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_logs
    ADD CONSTRAINT event_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: immunization_schedule_vaccines immunization_schedule_vaccines_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_schedule_vaccines
    ADD CONSTRAINT immunization_schedule_vaccines_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.immunization_schedules(id) ON DELETE CASCADE;


--
-- Name: immunization_schedule_vaccines immunization_schedule_vaccines_vaccine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.immunization_schedule_vaccines
    ADD CONSTRAINT immunization_schedule_vaccines_vaccine_id_fkey FOREIGN KEY (vaccine_id) REFERENCES public.immunization_vaccines(id) ON DELETE CASCADE;


--
-- Name: inventory_batches inventory_batches_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_batches
    ADD CONSTRAINT inventory_batches_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: inventory_batches inventory_batches_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_batches
    ADD CONSTRAINT inventory_batches_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- Name: inventory_movements inventory_movements_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.inventory_batches(id);


--
-- Name: inventory_movements inventory_movements_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: inventory_movements inventory_movements_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: invoice_items invoice_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.inventory_batches(id);


--
-- Name: invoice_items invoice_items_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: invoices invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoices invoices_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_requests lab_requests_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_requests lab_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: lab_requests lab_requests_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_requests
    ADD CONSTRAINT lab_requests_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: lab_results lab_results_lab_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_lab_request_id_fkey FOREIGN KEY (lab_request_id) REFERENCES public.lab_requests(id);


--
-- Name: lab_results lab_results_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: migration_jobs migration_jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migration_jobs
    ADD CONSTRAINT migration_jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: patient_assignments patient_assignments_assigned_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_assignments
    ADD CONSTRAINT patient_assignments_assigned_by_user_id_fkey FOREIGN KEY (assigned_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: patient_assignments patient_assignments_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_assignments
    ADD CONSTRAINT patient_assignments_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: patient_assignments patient_assignments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_assignments
    ADD CONSTRAINT patient_assignments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_encounters patient_encounters_billed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_encounters
    ADD CONSTRAINT patient_encounters_billed_by_fkey FOREIGN KEY (billed_by) REFERENCES public.users(id);


--
-- Name: patient_encounters patient_encounters_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_encounters
    ADD CONSTRAINT patient_encounters_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: patient_encounters patient_encounters_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_encounters
    ADD CONSTRAINT patient_encounters_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: patient_encounters patient_encounters_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_encounters
    ADD CONSTRAINT patient_encounters_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: patient_encounters patient_encounters_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_encounters
    ADD CONSTRAINT patient_encounters_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: patient_encounters patient_encounters_primary_provider_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_encounters
    ADD CONSTRAINT patient_encounters_primary_provider_fkey FOREIGN KEY (primary_provider) REFERENCES public.users(id);


--
-- Name: patient_encounters patient_encounters_sha_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_encounters
    ADD CONSTRAINT patient_encounters_sha_claim_id_fkey FOREIGN KEY (sha_claim_id) REFERENCES public.sha_claims(id);


--
-- Name: patient_encounters patient_encounters_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_encounters
    ADD CONSTRAINT patient_encounters_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: patient_family_planning patient_family_planning_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_family_planning
    ADD CONSTRAINT patient_family_planning_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.family_planning_methods(id);


--
-- Name: patient_family_planning patient_family_planning_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_family_planning
    ADD CONSTRAINT patient_family_planning_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_family_planning patient_family_planning_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_family_planning
    ADD CONSTRAINT patient_family_planning_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: patient_family_planning patient_family_planning_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_family_planning
    ADD CONSTRAINT patient_family_planning_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: patient_immunizations patient_immunizations_administered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_immunizations
    ADD CONSTRAINT patient_immunizations_administered_by_fkey FOREIGN KEY (administered_by) REFERENCES public.users(id);


--
-- Name: patient_immunizations patient_immunizations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_immunizations
    ADD CONSTRAINT patient_immunizations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_immunizations patient_immunizations_vaccine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_immunizations
    ADD CONSTRAINT patient_immunizations_vaccine_id_fkey FOREIGN KEY (vaccine_id) REFERENCES public.immunization_vaccines(id);


--
-- Name: patient_immunizations patient_immunizations_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_immunizations
    ADD CONSTRAINT patient_immunizations_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: patient_mch_services patient_mch_services_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_mch_services
    ADD CONSTRAINT patient_mch_services_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_mch_services patient_mch_services_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_mch_services
    ADD CONSTRAINT patient_mch_services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id);


--
-- Name: patient_mch_services patient_mch_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_mch_services
    ADD CONSTRAINT patient_mch_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.mch_services(id);


--
-- Name: patient_mch_services patient_mch_services_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patient_mch_services
    ADD CONSTRAINT patient_mch_services_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: payments payments_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.users(id);


--
-- Name: prescription_items prescription_items_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id);


--
-- Name: prescriptions prescriptions_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id);


--
-- Name: prescriptions prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: prescriptions prescriptions_prescribed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_prescribed_by_fkey FOREIGN KEY (prescribed_by) REFERENCES public.users(id);


--
-- Name: prescriptions prescriptions_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: sha_audit_trail sha_audit_trail_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_audit_trail
    ADD CONSTRAINT sha_audit_trail_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.sha_claims(id);


--
-- Name: sha_audit_trail sha_audit_trail_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_audit_trail
    ADD CONSTRAINT sha_audit_trail_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sha_invoices(id);


--
-- Name: sha_audit_trail sha_audit_trail_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_audit_trail
    ADD CONSTRAINT sha_audit_trail_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: sha_claim_batches sha_claim_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claim_batches
    ADD CONSTRAINT sha_claim_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sha_claim_batches sha_claim_batches_printed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claim_batches
    ADD CONSTRAINT sha_claim_batches_printed_by_fkey FOREIGN KEY (printed_by) REFERENCES public.users(id);


--
-- Name: sha_claim_items sha_claim_items_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claim_items
    ADD CONSTRAINT sha_claim_items_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.sha_claims(id);


--
-- Name: sha_claim_items sha_claim_items_provided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claim_items
    ADD CONSTRAINT sha_claim_items_provided_by_fkey FOREIGN KEY (provided_by) REFERENCES public.users(id);


--
-- Name: sha_claims sha_claims_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claims
    ADD CONSTRAINT sha_claims_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: sha_claims sha_claims_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claims
    ADD CONSTRAINT sha_claims_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sha_claims sha_claims_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claims
    ADD CONSTRAINT sha_claims_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: sha_claims sha_claims_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claims
    ADD CONSTRAINT sha_claims_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: sha_claims sha_claims_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claims
    ADD CONSTRAINT sha_claims_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: sha_claims sha_claims_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_claims
    ADD CONSTRAINT sha_claims_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: sha_compliance sha_compliance_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_compliance
    ADD CONSTRAINT sha_compliance_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.sha_claims(id);


--
-- Name: sha_compliance sha_compliance_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_compliance
    ADD CONSTRAINT sha_compliance_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sha_invoices(id);


--
-- Name: sha_compliance sha_compliance_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_compliance
    ADD CONSTRAINT sha_compliance_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: sha_document_attachments sha_document_attachments_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_document_attachments
    ADD CONSTRAINT sha_document_attachments_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.sha_claims(id);


--
-- Name: sha_document_attachments sha_document_attachments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_document_attachments
    ADD CONSTRAINT sha_document_attachments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sha_invoices(id);


--
-- Name: sha_document_attachments sha_document_attachments_last_accessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_document_attachments
    ADD CONSTRAINT sha_document_attachments_last_accessed_by_fkey FOREIGN KEY (last_accessed_by) REFERENCES public.users(id);


--
-- Name: sha_document_attachments sha_document_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_document_attachments
    ADD CONSTRAINT sha_document_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: sha_export_logs sha_export_logs_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_export_logs
    ADD CONSTRAINT sha_export_logs_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: sha_export_logs sha_export_logs_exported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_export_logs
    ADD CONSTRAINT sha_export_logs_exported_by_fkey FOREIGN KEY (exported_by) REFERENCES public.users(id);


--
-- Name: sha_invoices sha_invoices_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_invoices
    ADD CONSTRAINT sha_invoices_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.sha_claims(id);


--
-- Name: sha_invoices sha_invoices_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_invoices
    ADD CONSTRAINT sha_invoices_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id);


--
-- Name: sha_invoices sha_invoices_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_invoices
    ADD CONSTRAINT sha_invoices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: sha_invoices sha_invoices_printed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_invoices
    ADD CONSTRAINT sha_invoices_printed_by_fkey FOREIGN KEY (printed_by) REFERENCES public.users(id);


--
-- Name: sha_invoices sha_invoices_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_invoices
    ADD CONSTRAINT sha_invoices_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: sha_invoices sha_invoices_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_invoices
    ADD CONSTRAINT sha_invoices_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- Name: sha_submission_logs sha_submission_logs_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_submission_logs
    ADD CONSTRAINT sha_submission_logs_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.sha_claim_batches(id);


--
-- Name: sha_submission_logs sha_submission_logs_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_submission_logs
    ADD CONSTRAINT sha_submission_logs_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.sha_claims(id);


--
-- Name: sha_submission_logs sha_submission_logs_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_submission_logs
    ADD CONSTRAINT sha_submission_logs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sha_invoices(id);


--
-- Name: sha_workflow_instances sha_workflow_instances_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_workflow_instances
    ADD CONSTRAINT sha_workflow_instances_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.sha_claims(id);


--
-- Name: sha_workflow_instances sha_workflow_instances_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_workflow_instances
    ADD CONSTRAINT sha_workflow_instances_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: sha_workflow_instances sha_workflow_instances_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_workflow_instances
    ADD CONSTRAINT sha_workflow_instances_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.users(id);


--
-- Name: sha_workflow_steps sha_workflow_steps_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_workflow_steps
    ADD CONSTRAINT sha_workflow_steps_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES public.users(id);


--
-- Name: sha_workflow_steps sha_workflow_steps_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sha_workflow_steps
    ADD CONSTRAINT sha_workflow_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.sha_workflow_instances(id) ON DELETE CASCADE;


--
-- Name: stock_adjustments stock_adjustments_adjusted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_adjusted_by_fkey FOREIGN KEY (adjusted_by) REFERENCES public.users(id);


--
-- Name: stock_adjustments stock_adjustments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: stock_adjustments stock_adjustments_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_adjustments
    ADD CONSTRAINT stock_adjustments_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);


--
-- Name: stock_alerts stock_alerts_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: stock_alerts stock_alerts_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_alerts
    ADD CONSTRAINT stock_alerts_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);


--
-- Name: stock_categories stock_categories_parent_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_categories
    ADD CONSTRAINT stock_categories_parent_category_id_fkey FOREIGN KEY (parent_category_id) REFERENCES public.stock_categories(id);


--
-- Name: stock_items stock_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.stock_categories(id);


--
-- Name: stock_items stock_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stock_items stock_items_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id);


--
-- Name: stock_movements stock_movements_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);


--
-- Name: stock_purchase_items stock_purchase_items_purchase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_purchase_items
    ADD CONSTRAINT stock_purchase_items_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.stock_purchases(id) ON DELETE CASCADE;


--
-- Name: stock_purchase_items stock_purchase_items_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_purchase_items
    ADD CONSTRAINT stock_purchase_items_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);


--
-- Name: stock_purchases stock_purchases_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_purchases
    ADD CONSTRAINT stock_purchases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: stock_purchases stock_purchases_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_purchases
    ADD CONSTRAINT stock_purchases_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.stock_suppliers(id);


--
-- Name: stock_request_items stock_request_items_stock_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_request_items
    ADD CONSTRAINT stock_request_items_stock_item_id_fkey FOREIGN KEY (stock_item_id) REFERENCES public.stock_items(id);


--
-- Name: stock_request_items stock_request_items_stock_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_request_items
    ADD CONSTRAINT stock_request_items_stock_request_id_fkey FOREIGN KEY (stock_request_id) REFERENCES public.stock_requests(id) ON DELETE CASCADE;


--
-- Name: stock_requests stock_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_requests
    ADD CONSTRAINT stock_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: stock_requests stock_requests_fulfilled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_requests
    ADD CONSTRAINT stock_requests_fulfilled_by_fkey FOREIGN KEY (fulfilled_by) REFERENCES public.users(id);


--
-- Name: stock_requests stock_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_requests
    ADD CONSTRAINT stock_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: stock_requests stock_requests_requested_for_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_requests
    ADD CONSTRAINT stock_requests_requested_for_fkey FOREIGN KEY (requested_for) REFERENCES public.users(id);


--
-- Name: user_presence user_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_presence
    ADD CONSTRAINT user_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: visits visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: vitals vitals_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: vitals vitals_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id);


--
-- PostgreSQL database dump complete
--

\unrestrict tD60t2QPRfNJdpq4lfFvcEhE25btZ9SUfV54NOpdMX4DhDehADxMDtjoSO83Z4l

