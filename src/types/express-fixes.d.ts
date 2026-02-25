// Build-time shims to ensure Express request/response types include the fields we use.
// This is a safe augmentation layer and does not change runtime behavior.
import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    body: any;
    params: any;
    query: any;
    headers: any;
    files?: any;
    userId?: string;
    user?: any;
  }

  interface Response {
    status(code: number): this;
    json(body?: any): this;
    send(body?: any): this;
    setHeader(name: string, value: any): this;
    getHeader(name: string): any;
    statusCode?: number;
  }
}
