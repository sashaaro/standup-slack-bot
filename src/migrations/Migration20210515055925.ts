import { Migration } from '@mikro-orm/migrations';

export class Migration20210515055925 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "team" add column "schedule_bitmask" bit(7) not null default 31::bit(7);');
    this.addSql('alter table "team" drop column "days";');
  }
}
