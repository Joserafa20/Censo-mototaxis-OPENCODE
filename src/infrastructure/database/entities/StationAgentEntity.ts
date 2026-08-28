/**
 * TypeORM Entity: StationAgentEntity
 *
 * Maps the StationAgent domain entity to the `station_agents` table.
 * Tracks mototaxi agent assignments to stations.
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("station_agents")
export class StationAgentEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  stationId!: string;

  @Column({ type: "uuid" })
  censusRecordId!: string;

  @CreateDateColumn()
  assignedAt!: Date;

  @Column({ type: "datetime", nullable: true })
  unassignedAt!: Date | null;
}
