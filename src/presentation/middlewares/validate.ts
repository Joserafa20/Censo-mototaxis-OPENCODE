import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import xss from "xss";

function sanitize(value: any): any {
  if (typeof value === "string") {
    let v = xss(value);
    v = v.replace(/\$/g, "").replace(/\{/g, "").replace(/\}/g, "");
    return v;
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, val] of Object.entries(value)) out[k] = sanitize(val);
    return out;
  }
  return value;
}

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = { body: req.body, params: req.params, query: req.query };
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      res.status(400).json({ code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.issues });
      return;
    }
    // sanitize body/params/query
    if (req.body) req.body = sanitize(req.body);
    next();
  };
}
export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  next();
}
