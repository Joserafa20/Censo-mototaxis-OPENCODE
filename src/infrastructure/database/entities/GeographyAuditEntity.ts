/**
 * TypeORM Entity: GeographyAuditEntity
 *
 * Maps the GeographyAuditEntry domain entity to the `geography_audit_log` table.
 * Uses TypeORM decorators for column definitions and indexes.
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("geography_audit_log")
export class GeographyAuditEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50 })
  entityType!: string;

  @Column({ type: "uuid" })
  entityId!: string;

  @Column({ type: "uuid" })
  actorUserId!: string;

  @Column({ type: "varchar", length: 50 })
  action!: string;

  @Column({ type: "text", nullable: true })
  details!: string | null;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
