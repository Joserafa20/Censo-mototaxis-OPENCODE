import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
} from "typeorm";

@Entity("audit_logs")
@Index(["entityType", "entityId", "timestamp"])
export class AuditLogEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  entityType!: string;

  @Column({ type: "uuid" })
  entityId!: string;

  @Column({ type: "varchar", length: 50 })
  action!: string;

  @Column({ type: "uuid" })
  actorId!: string;

  @Column({ type: "varchar", length: 20 })
  actorRole!: string;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  timestamp!: Date;

  @Column({ type: "simple-json", nullable: true })
  before!: Record<string, unknown> | null;

  @Column({ type: "simple-json", nullable: true })
  after!: Record<string, unknown> | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
