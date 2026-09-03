/**
 * Diploma Database min: three application roles.
 *
 * Product truth: one Express process, one DATABASE_URL. These roles do not
 * change UX. They exist so the API is not forced to run as a superuser:
 *   app_read  — future reporting / read replica (unused by the API today)
 *   app_write — runtime DML for the API
 *   app_admin — DDL / maintenance (operator), not the Node process
 *
 * Roles are created NOLOGIN. The operator (or Azure) attaches LOGIN + password
 * outside Git. Local `npm run dev` may keep using the postgres owner.
 *
 * Names match backend/src/constants.ts (DB_ROLE_APP_*).
 */

const ROLE_APP_READ = 'app_read';
const ROLE_APP_WRITE = 'app_write';
const ROLE_APP_ADMIN = 'app_admin';

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    DO $do$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${ROLE_APP_READ}') THEN
        CREATE ROLE ${ROLE_APP_READ} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${ROLE_APP_WRITE}') THEN
        CREATE ROLE ${ROLE_APP_WRITE} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${ROLE_APP_ADMIN}') THEN
        CREATE ROLE ${ROLE_APP_ADMIN} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
      END IF;
    END
    $do$;
  `);

  pgm.sql(`
    DO $do$
    DECLARE
      database_name text := current_database();
    BEGIN
      EXECUTE format(
        'GRANT CONNECT ON DATABASE %I TO ${ROLE_APP_READ}, ${ROLE_APP_WRITE}, ${ROLE_APP_ADMIN}',
        database_name
      );
    END
    $do$;
  `);

  pgm.sql(`GRANT USAGE ON SCHEMA public TO ${ROLE_APP_READ}, ${ROLE_APP_WRITE}, ${ROLE_APP_ADMIN}`);

  pgm.sql(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${ROLE_APP_READ}`);
  pgm.sql(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE_APP_WRITE}`
  );
  pgm.sql(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${ROLE_APP_ADMIN}`);

  pgm.sql(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ROLE_APP_WRITE}, ${ROLE_APP_ADMIN}`);
  pgm.sql(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${ROLE_APP_ADMIN}`);

  pgm.sql(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${ROLE_APP_READ}`
  );
  pgm.sql(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ROLE_APP_WRITE}`
  );
  pgm.sql(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${ROLE_APP_ADMIN}`);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.sql(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM ${ROLE_APP_READ}, ${ROLE_APP_WRITE}, ${ROLE_APP_ADMIN}`
  );
  pgm.sql(
    `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM ${ROLE_APP_READ}, ${ROLE_APP_WRITE}, ${ROLE_APP_ADMIN}`
  );
  pgm.sql(
    `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM ${ROLE_APP_READ}, ${ROLE_APP_WRITE}, ${ROLE_APP_ADMIN}`
  );
  pgm.sql(`REVOKE USAGE ON SCHEMA public FROM ${ROLE_APP_READ}, ${ROLE_APP_WRITE}, ${ROLE_APP_ADMIN}`);

  pgm.sql(`
    DO $do$
    DECLARE
      database_name text := current_database();
    BEGIN
      EXECUTE format(
        'REVOKE CONNECT ON DATABASE %I FROM ${ROLE_APP_READ}, ${ROLE_APP_WRITE}, ${ROLE_APP_ADMIN}',
        database_name
      );
    END
    $do$;
  `);

  pgm.sql(`DROP ROLE IF EXISTS ${ROLE_APP_READ}`);
  pgm.sql(`DROP ROLE IF EXISTS ${ROLE_APP_WRITE}`);
  pgm.sql(`DROP ROLE IF EXISTS ${ROLE_APP_ADMIN}`);
};
