import { Migration } from '@mikro-orm/migrations';

export class Migration20210327054611 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "team" add column "report_channel_id" varchar(255) not null;');
    this.addSql('alter table "team" add constraint "team_report_channel_id_foreign" foreign key ("report_channel_id") references "channel" ("id") on update cascade;');
  }

}
