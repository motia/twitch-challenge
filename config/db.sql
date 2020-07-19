--
-- PostgreSQL database dump
--

-- Dumped from database version 12.2 (Ubuntu 12.2-2.pgdg18.04+1)
-- Dumped by pg_dump version 12.2 (Ubuntu 12.2-2.pgdg18.04+1)

SET statement_timeout
= 0;
SET lock_timeout
= 0;
SET idle_in_transaction_session_timeout
= 0;
SET client_encoding
= 'UTF8';
SET standard_conforming_strings
= on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies
= false;
SET xmloption
= content;
SET client_min_messages
= warning;
SET row_security
= off;

SET default_tablespace
= '';

SET default_table_access_method
= heap;

--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events
(
    id bigint NOT NULL,
    created_at timestamp
    without time zone NOT NULL,
    viewer_name character varying
    (200) NOT NULL,
    streamer_name character varying
    (200) NOT NULL,
    event_type character varying
    (30) NOT NULL
);


    --
    -- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
    --

    CREATE SEQUENCE public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


    --
    -- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
    --

    ALTER SEQUENCE public.events_id_seq
    OWNED BY public.events.id;


    --
    -- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
    --

    CREATE TABLE public.subscriptions
    (
        id bigint NOT NULL,
        viewer_name character varying(200) NOT NULL,
        secret character varying(55) NOT NULL,
        created_at timestamp
        without time zone NOT NULL,
    streamer_name character varying
        (200)
);


        --
        -- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
        --

        CREATE SEQUENCE public.subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


        --
        -- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
        --

        ALTER SEQUENCE public.subscriptions_id_seq
        OWNED BY public.subscriptions.id;


        --
        -- Name: webhooks; Type: TABLE; Schema: public; Owner: -
        --

        CREATE TABLE public.webhooks
        (
            id bigint NOT NULL,
            type character varying(20) NOT NULL,
            streamer_name character varying(20) NOT NULL,
            created_at timestamp
            without time zone DEFAULT now
            () NOT NULL
);


            --
            -- Name: webhooks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
            --

            CREATE SEQUENCE public.webhooks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


            --
            -- Name: webhooks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
            --

            ALTER SEQUENCE public.webhooks_id_seq
            OWNED BY public.webhooks.id;


            --
            -- Name: events id; Type: DEFAULT; Schema: public; Owner: -
            --

            ALTER TABLE ONLY public.events
            ALTER COLUMN id
            SET
            DEFAULT nextval
            ('public.events_id_seq'::regclass);


            --
            -- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: -
            --

            ALTER TABLE ONLY public.subscriptions
            ALTER COLUMN id
            SET
            DEFAULT nextval
            ('public.subscriptions_id_seq'::regclass);


            --
            -- Name: webhooks id; Type: DEFAULT; Schema: public; Owner: -
            --

            ALTER TABLE ONLY public.webhooks
            ALTER COLUMN id
            SET
            DEFAULT nextval
            ('public.webhooks_id_seq'::regclass);


            --
            -- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
            --

            ALTER TABLE ONLY public.events
            ADD CONSTRAINT events_pkey PRIMARY KEY
            (id);


            --
            -- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
            --

            ALTER TABLE ONLY public.subscriptions
            ADD CONSTRAINT subscriptions_pkey PRIMARY KEY
            (id);


            --
            -- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
            --

            ALTER TABLE ONLY public.webhooks
            ADD CONSTRAINT webhooks_pkey PRIMARY KEY
            (id);


--
-- PostgreSQL database dump complete
--

