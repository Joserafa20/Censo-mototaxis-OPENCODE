import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("census_audit")
export class CensusAuditEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50 })
  entityType!: string;

  @Column({ type: "uuid" })
  @Index()
  entityId!: string;

  @Column({ type: "varchar", length: 20 })
  action!: string;

  @Column({ type: "uuid" })
  actorUserId!: string;

  @Column({ type: "simple-json", nullable: true })
  details!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
