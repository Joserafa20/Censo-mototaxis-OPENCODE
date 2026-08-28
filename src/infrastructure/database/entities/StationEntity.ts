/**
 * TypeORM Entity: StationEntity
 *
 * Maps the Station domain entity to the `stations` table.
 * Uses TypeORM decorators for column definitions and indexes.
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("stations")
export class StationEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "varchar", length: 10, default: "rural" })
  locationType!: string; // "urban" | "rural"

  @Column({ type: "uuid", nullable: true })
  corregimientoId!: string | null;

  @Column({ type: "uuid", nullable: true })
  neighborhoodId!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
