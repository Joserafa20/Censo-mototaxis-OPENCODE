/**
 * App entry point
 *
 * Assembles the Express server, routes, and dependency injection.
 * This file wires together all layers without importing infrastructure
 * details — it receives configured dependencies from the outside.
 */

import { Router } from "express";
import { createServer } from "./presentation/server.js";
import { createAuthRoutes } from "./presentation/routes/auth.routes.js";
import { createUserRoutes } from "./presentation/routes/user.routes.js";
import { createCensusPeriodRoutes } from "./presentation/routes/census-periods.routes.js";
import { AuthController } from "./presentation/controllers/AuthController.js";
import { UserController } from "./presentation/controllers/UserController.js";
import { CensusPeriodController } from "./presentation/controllers/CensusPeriodController.js";
import { LoginUseCase } from "./application/use-cases/LoginUseCase.js";
import { RefreshTokenUseCase } from "./application/use-cases/RefreshTokenUseCase.js";
import { LogoutUseCase } from "./application/use-cases/LogoutUseCase.js";
import { CreateUserUseCase } from "./application/use-cases/CreateUserUseCase.js";
import { ListUsersUseCase } from "./application/use-cases/ListUsersUseCase.js";
import { EditUserProfileUseCase } from "./application/use-cases/EditUserProfileUseCase.js";
import { DeactivateUserUseCase } from "./application/use-cases/DeactivateUserUseCase.js";
import { ReactivateUserUseCase } from "./application/use-cases/ReactivateUserUseCase.js";
import { ManualPasswordResetUseCase } from "./application/use-cases/ManualPasswordResetUseCase.js";
import { CreateCensusPeriodUseCase } from "./application/use-cases/CreateCensusPeriodUseCase.js";
import { UpdateCensusPeriodUseCase } from "./application/use-cases/UpdateCensusPeriodUseCase.js";
import { ChangeCensusPeriodStatusUseCase } from "./application/use-cases/ChangeCensusPeriodStatusUseCase.js";
import { ListCensusPeriodsUseCase } from "./application/use-cases/ListCensusPeriodsUseCase.js";
import { CreateCorregimientoUseCase } from "./application/use-cases/CreateCorregimientoUseCase.js";
import { CreateNeighborhoodUseCase } from "./application/use-cases/CreateNeighborhoodUseCase.js";
import { DeactivateCorregimientoUseCase } from "./application/use-cases/DeactivateCorregimientoUseCase.js";
import { ReactivateNeighborhoodUseCase } from "./application/use-cases/ReactivateNeighborhoodUseCase.js";
import { GetGeographyTreeUseCase } from "./application/use-cases/GetGeographyTreeUseCase.js";
import { ListCorregimientosUseCase } from "./application/use-cases/ListCorregimientosUseCase.js";
import { CreateStationUseCase } from "./application/use-cases/CreateStationUseCase.js";
import { ListStationsUseCase } from "./application/use-cases/ListStationsUseCase.js";
import { DeactivateStationUseCase } from "./application/use-cases/DeactivateStationUseCase.js";
import { AssignAgentUseCase } from "./application/use-cases/AssignAgentUseCase.js";
import { UnassignAgentUseCase } from "./application/use-cases/UnassignAgentUseCase.js";
import { CreateCensusRecordUseCase } from "./application/use-cases/CreateCensusRecordUseCase.js";
import { ListCensusRecordsUseCase } from "./application/use-cases/ListCensusRecordsUseCase.js";
import { SearchCensusRecordsUseCase } from "./application/use-cases/SearchCensusRecordsUseCase.js";
import { DeactivateCensusRecordUseCase } from "./application/use-cases/DeactivateCensusRecordUseCase.js";
import { SubmitCensusRecordUseCase } from "./application/use-cases/SubmitCensusRecordUseCase.js";
import { ReviewCensusRecordUseCase } from "./application/use-cases/ReviewCensusRecordUseCase.js";
import { ApproveCensusRecordUseCase } from "./application/use-cases/ApproveCensusRecordUseCase.js";
import { RejectCensusRecordUseCase } from "./application/use-cases/RejectCensusRecordUseCase.js";
import { CloseCensusPeriodUseCase } from "./application/use-cases/CloseCensusPeriodUseCase.js";
import { GeographyController } from "./presentation/controllers/GeographyController.js";
import { StationController } from "./presentation/controllers/StationController.js";
import { CensusController } from "./presentation/controllers/CensusController.js";
import { createGeographyRoutes } from "./presentation/routes/geography.routes.js";
import { AddEvidencePhotoUseCase } from "./application/use-cases/AddEvidencePhotoUseCase.js";
import { FileEvidenceStorage } from "./infrastructure/storage/FileEvidenceStorage.js";
import { createStationRoutes } from "./presentation/routes/stations.routes.js";
import { createCensusRecordRoutes } from "./presentation/routes/census-records.routes.js";
import { createReportRoutes } from "./presentation/routes/report.routes.js";
import { ReportController } from "./presentation/controllers/ReportController.js";
import { GetReportSummaryUseCase } from "./application/use-cases/GetReportSummaryUseCase.js";
import { ExportReportUseCase } from "./application/use-cases/ExportReportUseCase.js";
import { TypeormReportRepository } from "./infrastructure/repositories/TypeormReportRepository.js";
import { InMemoryReportCache } from "./infrastructure/cache/InMemoryReportCache.js";
import { CsvExporter } from "./infrastructure/export/CsvExporter.js";
import { ExcelExporter } from "./infrastructure/export/ExcelExporter.js";
import { PdfExporter } from "./infrastructure/export/PdfExporter.js";
import { TypeormValidationRepository } from "./infrastructure/repositories/TypeormValidationRepository.js";
import { TypeormAuditLogRepository } from "./infrastructure/repositories/TypeormAuditLogRepository.js";
import { GetAuditTimelineUseCase } from "./application/use-cases/GetAuditTimelineUseCase.js";
import { AuditController } from "./presentation/controllers/AuditController.js";
import { createAuditRoutes } from "./presentation/routes/audit.routes.js";
import { CensusValidationEntity } from "./infrastructure/database/entities/CensusValidationEntity.js";
import { errorHandler } from "./presentation/middlewares/errorHandler.js";
import type { IUserRepository } from "./domain/repositories/IUserRepository.js";
import type { IRefreshTokenRepository } from "./domain/repositories/IRefreshTokenRepository.js";
import type { ILoginAuditRepository } from "./domain/repositories/ILoginAuditRepository.js";
import type { IUserAuditRepository } from "./domain/repositories/IUserAuditRepository.js";
import type { IPasswordResetRepository } from "./domain/repositories/IPasswordResetRepository.js";
import type { ICensusPeriodRepository } from "./domain/repositories/ICensusPeriodRepository.js";
import type { IMunicipalityRepository } from "./domain/repositories/IMunicipalityRepository.js";
import type { ICorregimientoRepository } from "./domain/repositories/ICorregimientoRepository.js";
import type { INeighborhoodRepository } from "./domain/repositories/INeighborhoodRepository.js";
import type { IGeographyAuditRepository } from "./domain/repositories/IGeographyAuditRepository.js";
import type { IStationRepository } from "./domain/repositories/IStationRepository.js";
import type { IStationAgentRepository } from "./domain/repositories/IStationAgentRepository.js";
import type { ICensusRecordRepository } from "./domain/repositories/ICensusRecordRepository.js";
import type { ICensusAuditRepository } from "./domain/repositories/ICensusAuditRepository.js";
import type { IPasswordHasher } from "./domain/services/IPasswordHasher.js";
import type { ITokenService } from "./domain/services/ITokenService.js";
import type { ISecureTokenGenerator } from "./domain/services/ISecureTokenGenerator.js";
import type { Express } from "express";

export interface AppDependencies {
  userRepo: IUserRepository;
  refreshTokenRepo: IRefreshTokenRepository;
  auditRepo: ILoginAuditRepository;
  userAuditRepo: IUserAuditRepository;
  passwordResetRepo: IPasswordResetRepository;
  censusPeriodRepo: ICensusPeriodRepository;
  municipalityRepo: IMunicipalityRepository;
  corregimientoRepo: ICorregimientoRepository;
  neighborhoodRepo: INeighborhoodRepository;
  geographyAuditRepo: IGeographyAuditRepository;
  stationRepo: IStationRepository;
  stationAgentRepo: IStationAgentRepository;
  censusRecordRepo: ICensusRecordRepository;
  censusAuditRepo: ICensusAuditRepository;
  passwordHasher: IPasswordHasher;
  tokenService: ITokenService;
  secureTokenGenerator: ISecureTokenGenerator;
  dataSource?: any;
  validationRepo?: any;
}

export function createApp(deps: AppDependencies): Express {
  // ── Auth use cases ───────────────────────────────────────────────
  const loginUseCase = new LoginUseCase(
    deps.userRepo,
    deps.refreshTokenRepo,
    deps.auditRepo,
    deps.passwordHasher,
    deps.tokenService
  );

  const refreshTokenUseCase = new RefreshTokenUseCase(
    deps.refreshTokenRepo,
    deps.tokenService,
    deps.auditRepo
  );

  const logoutUseCase = new LogoutUseCase(
    deps.refreshTokenRepo,
    deps.auditRepo
  );

  // ── User management use cases ────────────────────────────────────
  const createUserUseCase = new CreateUserUseCase(
    deps.userRepo,
    deps.userAuditRepo,
    deps.passwordHasher
  );

  const listUsersUseCase = new ListUsersUseCase(deps.userRepo);

  const editUserProfileUseCase = new EditUserProfileUseCase(
    deps.userRepo,
    deps.userAuditRepo
  );

  const deactivateUserUseCase = new DeactivateUserUseCase(
    deps.userRepo,
    deps.refreshTokenRepo,
    deps.userAuditRepo
  );

  const reactivateUserUseCase = new ReactivateUserUseCase(
    deps.userRepo,
    deps.userAuditRepo
  );

  const manualPasswordResetUseCase = new ManualPasswordResetUseCase(
    deps.userRepo,
    deps.passwordResetRepo,
    deps.refreshTokenRepo,
    deps.userAuditRepo,
    deps.secureTokenGenerator
  );

  // ── Census period use cases ──────────────────────────────────────
  const createCensusPeriodUseCase = new CreateCensusPeriodUseCase(deps.censusPeriodRepo);
  const updateCensusPeriodUseCase = new UpdateCensusPeriodUseCase(deps.censusPeriodRepo);
  const changeCensusPeriodStatusUseCase = new ChangeCensusPeriodStatusUseCase(deps.censusPeriodRepo);
  const listCensusPeriodsUseCase = new ListCensusPeriodsUseCase(deps.censusPeriodRepo);

  // ── Geography use cases ──────────────────────────────────────────
  const createCorregimientoUseCase = new CreateCorregimientoUseCase(
    deps.corregimientoRepo,
    deps.municipalityRepo,
    deps.geographyAuditRepo
  );

  const createNeighborhoodUseCase = new CreateNeighborhoodUseCase(
    deps.neighborhoodRepo,
    deps.corregimientoRepo,
    deps.geographyAuditRepo
  );

  const deactivateCorregimientoUseCase = new DeactivateCorregimientoUseCase(
    deps.corregimientoRepo,
    deps.neighborhoodRepo,
    deps.geographyAuditRepo
  );

  const reactivateNeighborhoodUseCase = new ReactivateNeighborhoodUseCase(
    deps.neighborhoodRepo,
    deps.corregimientoRepo,
    deps.geographyAuditRepo
  );

  const getGeographyTreeUseCase = new GetGeographyTreeUseCase(
    deps.municipalityRepo,
    deps.corregimientoRepo,
    deps.neighborhoodRepo
  );

  const listCorregimientosUseCase = new ListCorregimientosUseCase(
    deps.corregimientoRepo,
    deps.neighborhoodRepo
  );

  // ── Station use cases ────────────────────────────────────────────
  const createStationUseCase = new CreateStationUseCase(
    deps.stationRepo,
    deps.corregimientoRepo
  );

  const listStationsUseCase = new ListStationsUseCase(
    deps.stationRepo,
    deps.stationAgentRepo
  );

  const deactivateStationUseCase = new DeactivateStationUseCase(
    deps.stationRepo,
    deps.stationAgentRepo
  );

  const assignAgentUseCase = new AssignAgentUseCase(
    deps.stationRepo,
    deps.stationAgentRepo
  );

  const unassignAgentUseCase = new UnassignAgentUseCase(
    deps.stationRepo,
    deps.stationAgentRepo
  );

  // ── Validation infra ─────────────────────────────────────────────
  let validationRepo: any = (deps as any).validationRepo ?? null;
  if (!validationRepo && deps.dataSource) {
    try {
      const vRepo = deps.dataSource.getRepository(CensusValidationEntity);
      validationRepo = new TypeormValidationRepository(vRepo);
    } catch { validationRepo = { save: async () => {}, findByRecordId: async () => [], findByPeriodId: async () => [] }; }
  }
  if (!validationRepo) validationRepo = { save: async () => {}, findByRecordId: async () => [], findByPeriodId: async () => [] };

  // ── Census record use cases ──────────────────────────────────────
  const createCensusRecordUseCase = new CreateCensusRecordUseCase(
    deps.censusRecordRepo,
    deps.censusPeriodRepo,
    deps.corregimientoRepo,
    deps.neighborhoodRepo,
    deps.stationRepo,
    deps.censusAuditRepo
  );
  const listCensusRecordsUseCase = new ListCensusRecordsUseCase(deps.censusRecordRepo);
  const searchCensusRecordsUseCase = new SearchCensusRecordsUseCase(deps.censusRecordRepo);
  const deactivateCensusRecordUseCase = new DeactivateCensusRecordUseCase(
    deps.censusRecordRepo,
    deps.censusAuditRepo
  );
  const submitUseCase = new SubmitCensusRecordUseCase(deps.censusRecordRepo, deps.censusPeriodRepo, deps.corregimientoRepo, deps.neighborhoodRepo, validationRepo);
  const reviewUseCase = new ReviewCensusRecordUseCase(deps.censusRecordRepo, deps.censusPeriodRepo, validationRepo);
  const approveUseCase = new ApproveCensusRecordUseCase(deps.censusRecordRepo, deps.censusPeriodRepo, validationRepo);
  const rejectUseCase = new RejectCensusRecordUseCase(deps.censusRecordRepo, deps.censusPeriodRepo, validationRepo);
  const closePeriodUseCase = new CloseCensusPeriodUseCase(deps.censusPeriodRepo, deps.censusRecordRepo);
  const evidenceStorage = new FileEvidenceStorage(process.env.EVIDENCE_STORAGE_PATH ?? "./uploads/evidence");
  const addEvidenceUseCase = new AddEvidencePhotoUseCase(deps.censusRecordRepo, evidenceStorage);

  // ── Controllers ──────────────────────────────────────────────────
  const authController = new AuthController(
    loginUseCase,
    refreshTokenUseCase,
    logoutUseCase
  );

  const userController = new UserController(
    createUserUseCase,
    listUsersUseCase,
    editUserProfileUseCase,
    deactivateUserUseCase,
    reactivateUserUseCase,
    manualPasswordResetUseCase,
    deps.userRepo,
    deps.userAuditRepo
  );

  const censusPeriodController = new CensusPeriodController(
    createCensusPeriodUseCase,
    updateCensusPeriodUseCase,
    changeCensusPeriodStatusUseCase,
    listCensusPeriodsUseCase,
    deps.censusPeriodRepo,
    closePeriodUseCase
  );

  const geographyController = new GeographyController(
    createCorregimientoUseCase,
    createNeighborhoodUseCase,
    deactivateCorregimientoUseCase,
    reactivateNeighborhoodUseCase,
    getGeographyTreeUseCase,
    listCorregimientosUseCase,
    deps.municipalityRepo
  );

  const stationController = new StationController(
    createStationUseCase,
    listStationsUseCase,
    deactivateStationUseCase,
    assignAgentUseCase,
    unassignAgentUseCase,
    deps.stationRepo
  );

  const censusController = new CensusController(
    createCensusRecordUseCase,
    listCensusRecordsUseCase,
    searchCensusRecordsUseCase,
    deactivateCensusRecordUseCase,
    deps.censusRecordRepo,
    submitUseCase,
    reviewUseCase,
    approveUseCase,
    rejectUseCase,
    validationRepo,
    addEvidenceUseCase
  );

  // ── Report use cases ───────────────────────────────────────────────
  let reportRoutes: any = null;
  let auditRoutes: any = null;
  if (deps.dataSource) {
    const reportRepo = new TypeormReportRepository(deps.dataSource);
    const reportCache = new InMemoryReportCache(60_000);
    const csvExporter = new CsvExporter();
    const excelExporter = new ExcelExporter();
    const pdfExporter = new PdfExporter();
    const getSummaryUseCase = new GetReportSummaryUseCase(reportRepo, reportCache, deps.dataSource);
    const exportUseCase = new ExportReportUseCase(reportRepo, deps.dataSource, csvExporter, excelExporter, pdfExporter);
    const reportController = new ReportController(getSummaryUseCase, exportUseCase);
    reportRoutes = createReportRoutes(reportController, deps.tokenService);

    const auditRepo = new TypeormAuditLogRepository(deps.dataSource);
    const getAuditTimelineUseCase = new GetAuditTimelineUseCase(auditRepo);
    const auditController = new AuditController(getAuditTimelineUseCase);
    auditRoutes = createAuditRoutes(auditController, deps.tokenService);
  }

  // ── Routes ───────────────────────────────────────────────────────
  const authRoutes = createAuthRoutes(authController, deps.tokenService);
  const userRoutes = createUserRoutes(userController, deps.tokenService);
  const censusPeriodRoutes = createCensusPeriodRoutes(censusPeriodController, deps.tokenService);
  const geographyRoutes = createGeographyRoutes(geographyController, deps.tokenService);
  const stationRoutes = createStationRoutes(stationController, deps.tokenService);
  const censusRecordRoutes = createCensusRecordRoutes(censusController, deps.tokenService);

  // Assemble API router
  const apiRouter = Router();
  apiRouter.use("/auth", authRoutes);
  apiRouter.use("/users", userRoutes);
  apiRouter.use("/census-periods", censusPeriodRoutes);
  apiRouter.use("/geography", geographyRoutes);
  apiRouter.use("/stations", stationRoutes);
  apiRouter.use("/census-records", censusRecordRoutes);
  if (reportRoutes) apiRouter.use("/reports", reportRoutes);
  if (auditRoutes) apiRouter.use("/audit", auditRoutes);

  // Assemble server
  const app = createServer(apiRouter);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
