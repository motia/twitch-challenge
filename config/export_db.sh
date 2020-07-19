#! /bin/bash

pg_dump --schema-only --no-owner the_database > create_the_tables.sql
