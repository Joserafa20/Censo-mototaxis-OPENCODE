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
@Index(["status", "periodId"])
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

  @Column({ type: "varchar", length: 500, nullable: true })
  validationReason!: string | null;

  @Column({ type: "uuid", nullable: true })
  validatedBy!: string | null;

  @Column({ type: "datetime", nullable: true })
  validatedAt!: Date | null;

  @Column({ type: "uuid" })
  createdByUserId!: string;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", default: false })
  consentGiven!: boolean;

  @Column({ type: "text", default: "" })
  consentSignature!: string;

  @Column({ type: "datetime", nullable: true })
  consentDate!: Date | null;

  @Column({
    type: "text",
    nullable: true,
    transformer: {
      from: (v: string | null) => (v ? JSON.parse(v) as string[] : []),
      to: (v: string[] | null) => (v && v.length ? JSON.stringify(v) : null),
    },
  })
  evidencePhotos!: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  @Index({ unique: true, where: "clientId IS NOT NULL" } as any)
  clientId!: string | null;

  @Column({ type: "varchar", length: 36, nullable: true })
  @Index({ unique: true, where: "sticker_folio IS NOT NULL" } as any)
  stickerFolio!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
