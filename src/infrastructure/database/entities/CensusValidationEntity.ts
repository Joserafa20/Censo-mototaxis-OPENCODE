import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("census_validations")
@Index(["censusRecordId", "createdAt"])
@Index(["periodId"])
export class CensusValidationEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  censusRecordId!: string;

  @Column({ type: "uuid" })
  periodId!: string;

  @Column({ type: "varchar", length: 20 })
  fromStatus!: string;

  @Column({ type: "varchar", length: 20 })
  toStatus!: string;

  @Column({ type: "uuid" })
  actorUserId!: string;

  @Column({ type: "varchar", length: 20 })
  actorRole!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  reason!: string | null;

  @Column({ type: "simple-json", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
