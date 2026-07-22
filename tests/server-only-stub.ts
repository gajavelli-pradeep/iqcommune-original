// Test-only no-op for the `server-only` package. In the real build `server-only`
// throws if a service is pulled into a client component; vitest runs services
// directly in jsdom (not a React Server Component context), where that throw is
// a false positive. Aliased here via vitest.config.ts so service unit tests can
// import server modules. The guard still applies to the production build.
export {};
