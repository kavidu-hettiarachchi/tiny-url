import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { RedirectType } from './dto/url-mapping.enums';

//A link between urlMapping Table.
@Entity()
export class UrlMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  longUrl: string;

  @Column()
  shortCode: string;

  @Column({ default: 0 })
  visitCount: number;

  @Column({ nullable: true, type: 'timestamp' })
  lastVisited: Date | null;

  @Column({
    type: 'enum',
    enum: RedirectType,
    default: RedirectType.TEMPORARILY,
  })
  redirectType: RedirectType;
}