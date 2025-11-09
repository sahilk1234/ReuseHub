import "reflect-metadata";
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { AppConfig } from "@/config/AppConfig";
import { DIContainer } from "@/container/Container";
import { TYPES } from "@/container/types";
import path from "path";

export class App {
  private app: Application;
  private config: AppConfig;

  constructor() {
    this.app = express();
    this.config = DIContainer.getInstance().get<AppConfig>(TYPES.AppConfig);
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
      })
    );
    // CORS configuration
    console.log("🌐 CORS enabled for origins:", this.config.cors.origin);
    this.app.use(
      cors({
        origin: this.config.cors.origin,
        credentials: this.config.cors.credentials,
      })
    );

    // Body parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // Import middleware
    const {
      securityHeaders,
      requestId,
      corsPreflightHandler,
    } = require("@/api/middleware/security.middleware");
    const {
      notFoundHandler,
    } = require("@/api/middleware/errorHandler.middleware");

    // Apply security middleware
    this.app.use(securityHeaders);
    this.app.use(requestId);
    this.app.use(corsPreflightHandler);

    // Health check endpoint
    this.app.get("/health", (req: Request, res: Response) => {
      res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        environment: this.config.nodeEnv,
      });
    });

    const uploadsDir = path.join(process.cwd(), "uploads"); // => /app/uploads
    this.app.use("/uploads", express.static(uploadsDir));

    // API routes
    const apiRoutes = require("@/api/routes").default;
    this.app.use("/api", apiRoutes);

    // 404 handler for undefined routes
    this.app.use(notFoundHandler);
  }

  private initializeErrorHandling(): void {
    // Import error handler
    const {
      errorHandler,
    } = require("@/api/middleware/errorHandler.middleware");

    // Global error handler
    this.app.use(errorHandler);
  }

  public getApp(): Application {
    return this.app;
  }

  public listen(): void {
    this.app.listen(this.config.port, () => {
      console.log(`🚀 Re:UseNet server running on port ${this.config.port}`);
      console.log(`📊 Environment: ${this.config.nodeEnv}`);
      console.log(`🗄️  Database: ${this.config.database.type}`);
      console.log(`📁 Storage: ${this.config.storage.provider}`);
      console.log(`🔐 Auth: ${this.config.auth.provider}`);
      console.log(`🤖 AI: ${this.config.ai.provider}`);
      console.log(`🗺️  Maps: ${this.config.maps.provider}`);
      console.log(`📧 Notifications: ${this.config.notification.provider}`);
    });
  }
}
