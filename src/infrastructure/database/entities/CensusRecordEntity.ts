import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("census_records")
@Index(["mototaxiCedula"], { unique: true })
@Index(["motorcyclePlate"], { unique: true })
@Index(["status"])
@Index(["periodId"])
export class CensusRecordEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  periodId!: string;

  @Column({ type: "uuid" })
  corregimientoId!: string;

  @Column({ type: "uuid", nullable: true })
  neighborhoodId!: string | null;

  @Column({ type: "uuid", nullable: true })
  stationId!: string | null;

  @Column({ type: "varchar", length: 20 })
  operationType!: string;

  @Column({ type: "varchar", length: 20, unique: true })
  mototaxiCedula!: string;

  @Column({ type: "varchar", length: 100 })
  mototaxiFirstName!: string;

  @Column({ type: "varchar", length: 100 })
  mototaxiLastName!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  mototaxiPhone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  mototaxiAddress!: string | null;

  @Column({ type: "varchar", length: 10, unique: true })
  motorcyclePlate!: string;

  @Column({ type: "varchar", length: 50 })
  motorcycleBrand!: string;

  @Column({ type: "varchar", length: 50 })
  motorcycleModel!: string;

  @Column({ type: "varchar", length: 30 })
  motorcycleColor!: string;

  @Column({ type: "integer", nullable: true })
  motorcycleYear!: number | null;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  @Column({ type: "varchar", length: 20, default: "active" })
  status!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  inactiveReason!: string | null;

  @Column({ type: "uuid" })
  createdByUserId!: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
