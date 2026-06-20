import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

interface ValidateOptions {
  body?:  ZodSchema;
  query?: ZodSchema;
}

function formatErrors(errors: { path: (string | number)[]; message: string }[]) {
  return errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
}

export function validate(schemaOrOptions: ZodSchema | ValidateOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const options: ValidateOptions =
      'safeParse' in schemaOrOptions
        ? { body: schemaOrOptions as ZodSchema }
        : schemaOrOptions;

    if (options.body) {
      const result = options.body.safeParse(req.body);
      if (!result.success) {
        res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            details: formatErrors(result.error.errors),
          },
        });
        return;
      }
      req.body = result.data;
    }

    if (options.query) {
      const result = options.query.safeParse(req.query);
      if (!result.success) {
        res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query validation failed',
            details: formatErrors(result.error.errors),
          },
        });
        return;
      }
      req.query = result.data as Record<string, string>;
    }

    next();
  };
}
