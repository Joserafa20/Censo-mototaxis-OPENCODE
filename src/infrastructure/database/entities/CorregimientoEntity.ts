/**
 * TypeORM Entity: CorregimientoEntity
 *
 * Maps the Corregimiento domain entity to the `corregimientos` table.
 * Uses TypeORM decorators for column definitions and indexes.
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("corregimientos")
export class CorregimientoEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  municipalityId!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  latitude!: number | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  longitude!: number | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "datetime", nullable: true })
  deactivatedAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  deactivatedBy!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
