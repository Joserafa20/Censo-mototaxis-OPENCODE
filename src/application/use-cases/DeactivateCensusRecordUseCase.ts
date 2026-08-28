import type { ICensusRecordRepository } from "../../domain/repositories/ICensusRecordRepository.js";
import type { ICensusAuditRepository } from "../../domain/repositories/ICensusAuditRepository.js";
import {
  CensusRecordNotFoundError,
  CensusRecordAlreadyInactiveError,
} from "../../domain/errors/CensusErrors.js";

export interface DeactivateCensusRecordInput {
  recordId: string;
  reason: string;
  actorUserId: string;
}

export interface DeactivateCensusRecordOutput {
  success: boolean;
}

export class DeactivateCensusRecordUseCase {
  constructor(
    private readonly censusRecordRepo: ICensusRecordRepository,
    private readonly auditRepo: ICensusAuditRepository
  ) {}

  async execute(input: DeactivateCensusRecordInput): Promise<DeactivateCensusRecordOutput> {
    const record = await this.censusRecordRepo.findById(input.recordId);
    if (!record) throw new CensusRecordNotFoundError(input.recordId);

    if (!record.isActive || record.status === "inactive") {
      throw new CensusRecordAlreadyInactiveError();
    }

    if (!input.reason || !input.reason.trim()) {
      throw new Error("reason is required");
    }

    await this.censusRecordRepo.deactivateById(input.recordId, input.reason.trim());

    await this.auditRepo.log({
      entityType: "census_record",
      entityId: input.recordId,
      action: "deactivated",
      actorUserId: input.actorUserId,
      details: { reason: input.reason.trim() },
    });

    return { success: true };
  }
}
