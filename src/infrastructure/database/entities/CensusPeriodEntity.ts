/**
 * TypeORM Entity: CensusPeriodEntity
 *
 * Maps the CensusPeriod domain entity to the `census_periods` table.
 * Uses TypeORM decorators for column definitions and indexes.
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import type { CensusPeriodStatus } from "../../../domain/entities/CensusPeriod.js";

@Entity("census_periods")
export class CensusPeriodEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "date" })
  startDate!: Date;

  @Column({ type: "date" })
  endDate!: Date;

  @Column({ type: "varchar", length: 20, default: "INACTIVO" })
  status!: CensusPeriodStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
