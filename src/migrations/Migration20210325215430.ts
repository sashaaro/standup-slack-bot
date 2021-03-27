import { Migration } from '@mikro-orm/migrations';

export class Migration20210325215430 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "timezone" alter column "utc_offset" type interval using (\'0 seconds\'::interval);');
  }

}
