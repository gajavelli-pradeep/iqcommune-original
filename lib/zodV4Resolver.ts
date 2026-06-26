/**
 * Custom zodResolver compatible with zod v4.
 *
 * @hookform/resolvers v3.9.0 uses Array.isArray(error?.errors) to detect
 * ZodError, but zod v4 moved the issues array to error.issues (not error.errors).
 * This causes the built-in zodResolver to rethrow every validation error, leaving
 * react-hook-form's isSubmitting permanently stuck at true.
 *
 * This resolver uses safeParseAsync and reads error.issues (zod v4) with a
 * fallback to error.errors (zod v3).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Resolver } from "react-hook-form";

type AnySchema = {
  safeParseAsync: (v: unknown) => Promise<
    | { success: true; data: unknown }
    | { success: false; error: { issues?: any[]; errors?: any[] } }
  >;
};

export function zodV4Resolver(schema: AnySchema): Resolver<any> {
  return async (values) => {
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      return { values: result.data as Record<string, unknown>, errors: {} };
    }

    const issues: any[] = result.error.issues ?? result.error.errors ?? [];
    const errors: Record<string, { message: string; type: string }> = {};
    for (const issue of issues) {
      const path: string = (issue.path as (string | number)[]).join(".");
      if (path && !errors[path]) {
        errors[path] = { message: issue.message, type: String(issue.code) };
      }
    }

    return { values: {}, errors };
  };
}
