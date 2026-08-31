import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("alcaldia_config")
export class AlcaldiaConfigEntity {
  @PrimaryColumn("varchar")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  nombre!: string;

  @Column({ type: "varchar", nullable: true })
  nit!: string | null;

  @Column({ type: "varchar", nullable: true })
  direccion!: string | null;

  @Column({ type: "varchar", nullable: true })
  telefono!: string | null;

  @Column({ type: "varchar", nullable: true })
  email!: string | null;

  @Column({ type: "varchar", nullable: true })
  escudoPath!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
