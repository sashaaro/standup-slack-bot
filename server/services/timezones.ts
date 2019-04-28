import {Connection} from "typeorm";
import {timezone} from "../dictionary/timezone";
import {ITimezone, ITimezoneProvider} from "../bot/models";

const getPgTimezoneList = (connection: Connection): ITimezoneProvider => (
  (() => (connection.query('select * from pg_timezone_names LIMIT 10') as Promise<ITimezone[]>)) as ITimezoneProvider
)
export const getTimezoneList: ITimezoneProvider = () => (new Promise(resolve => {
  const list: ITimezone[] = []
  for (const time in timezone) {
    const value = timezone[time]

    list.push({name: value, abbrev: time, utc_offset: {hours: parseFloat(time)}} as ITimezone)
  }

  resolve(list);
}))
