import "express";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    user?: any;
    body: any;
    params: any;
    query: any;
    headers: any;
    files?: any;
    path: string;
    method: string;
  }

  interface Response {
    status(code: number): this;
    json(body?: any): this;
    send(body?: any): this;
    setHeader(name: string, value: any): this;
    getHeader(name: string): any;
    statusCode?: number;
  }

  interface NextFunction {
    (err?: any): void;
  }

  interface RequestHandler<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    Locals extends Record<string, any> = Record<string, any>
  > {
    (req: Request<P, ResBody, ReqBody, ReqQuery, Locals>, res: Response<ResBody, Locals>, next: NextFunction): any;
  }

  interface Application {
    use: (...handlers: any[]) => any;
    get: (...handlers: any[]) => any;
    listen: (...args: any[]) => any;
  }
}
