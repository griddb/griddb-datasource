import { Moment } from 'moment';
import { GridDBConstant } from '../util/griddb_constant';

/**
 * Replace all macro, variables and special variables in TQL
 *
 * @export
 * @class TemplateProcessor
 */
export default class TemplateProcessor {

  /**
   * Time sampling macro regex
   *
   * @memberof TemplateProcessor
   */
  public TIME_SAMPLING_REGEX = /(\$__timeSampling\(([^(),]+),([^(),]+)\))/g;

  /**
   * Time filter macro regex
   *
   * @memberof TemplateProcessor
   */
  public TIME_FILTER_REGEX = /(\$__timeFilter)/g;

  /**
   * Time range macro
   *
   * @memberof TemplateProcessor
   */
  public TIME_RANGE_FILTER_REGEX = /(\$__rangeFilter)/g;

  /**
   * Time interval special variable regex
   *
   * @memberof TemplateProcessor
   */
  public INTERVAL_REGEX = /(\$__interval)/g;

  /**
   * Min interval special variable regex
   *
   * @memberof TemplateProcessor
   */
  public MIN_INTERVAL_REGEX = /(\$__minInterval)/g;

  /**
   * Time column special variable regex
   *
   * @memberof TemplateProcessor
   */
  public TIME_COLUMN_REGEX = /(\$__timeColumn)/g;

  /**
   * Time from special variable regex
   *
   * @memberof TemplateProcessor
   */
  public TIME_FROM_REGEX = /(\$__timeFrom)/g;

  /**
   * Time to special variable regex
   *
   * @memberof TemplateProcessor
   */
  public TIME_TO_REGEX = /(\$__timeTo)/g;

  /**
   * All option variable regex
   *
   * @memberof TemplateProcessor
   */
  public ALL_OPTIONS_TO_REGEX = /(\$__all)/gi;

  /**
   * Grafana time format regex
   *
   * @memberof TemplateProcessor
   */
  public MS_DATE_TYPE_REGEX = /([0-9]+)(ms)/g;

  /**
   * Grafana second time regex
   *
   * @memberof TemplateProcessor
   */
  public S_DATE_TYPE_REGEX = /([0-9]+)(s)$/g;

  /**
   * Grafana minute time regex
   *
   * @memberof TemplateProcessor
   */
  public M_DATE_TYPE_REGEX = /([0-9]+)(m)$/g;

  /**
   * Grafana hour time regex
   *
   * @memberof TemplateProcessor
   */
  public H_DATE_TYPE_REGEX = /([0-9]+)(h)$/g;

  /**
   * Grafana day time regex
   *
   * @memberof TemplateProcessor
   */
  public D_DATE_TYPE_REGEX = /([0-9]+)(d)$/g;

  /**
   * Grafana week time regex
   *
   * @memberof TemplateProcessor
   */
  public W_DATE_TYPE_REGEX = /([0-9]+)(w)$/g;

  /**
   * Grafana month time regex
   *
   * @memberof TemplateProcessor
   */
  public MONTH_DATE_TYPE_REGEX = /([0-9]+)(M)$/g;

  /**
   * Grafana year time regex
   *
   * @memberof TemplateProcessor
   */
  public Y_DATE_TYPE_REGEX = /([0-9]+)(y)$/g;

  /**
   * Replace all macro, special variables and variable in query
   *
   * 1. Replace time filter macro $__timeFilter, $__rangeFilter (if has start time and end time), $__timeSampling
   * 2. Replace special variables
   * 3. Replace user defined variables
   *
   * @param {string} input TQL query
   * @param {*} data used for replace macros, variables
   * @returns query string with variable and macro replaced with actual value
   * @memberof TemplateProcessor
   */
  public replace(query: string, data: any) {

    const timeColumns: string[] = data.timeColumn;
    const interval: string = data.interval;
    const timeRange: any = data.timeRange;
    const templateSrv: any = data.templateSrv;
    const scopedVars: any = data.scopedVars;

    if (timeColumns.length === 1 && timeColumns[0]) {
      query = this.formatTimeFilterMacro(query, timeColumns[0]);
    }

    if (timeColumns.length === 2) {
      const startColumn = timeColumns[0];
      const endColumn = timeColumns[1];
      query = this.formatTimeRangeMacro(query, startColumn, endColumn);
    }

    query = this.formatTimeSamplingMacro(query);

    if (timeColumns.length === 1) {
      query = this.formatSpecialVariables(query, interval, timeRange);
    } else {
      query = this.formatSpecialVariables(query, interval, timeRange);
    }

    if (templateSrv && scopedVars) {
      query = this.formatCustomVariables(templateSrv, scopedVars, query);
    }

    return query;
  }

  /**
   * Format function Time_sampling() macro
   *
   * Input:
   * Case 1: $__timeSampling(column1, 3m )
   * Case 2: $__timeSampling(column1, $__interval )
   * Output: TimeSampling(column1, $__timeFrom, $__timeTo , 3, MINUTE)
   *
   * @param query query to format
   * @returns Query after replace time sampling macro
   */
  public formatTimeSamplingMacro(query: string) {

    let samplingRegexResult = this.TIME_SAMPLING_REGEX.exec(query);
    while (samplingRegexResult && samplingRegexResult.length >= 4) {
      const func = ('' + samplingRegexResult[0]).trim();
      const column = ('' + samplingRegexResult[2]).trim();
      const time = ('' + samplingRegexResult[3]).trim();

      let funcReplace = '';
      // If use case 2
      if (time === '$__interval' || time === '$__minInterval') {
        funcReplace = 'TIME_SAMPLING(' + column + ', $__timeFrom, $__timeTo, ' + time + ')';
      } else {
        // If use case 1
        const convertedTime = this.convertTimeInTimeSampling(time);
        funcReplace = 'TIME_SAMPLING(' + column + ', $__timeFrom, $__timeTo, ' + convertedTime.value + ', ' + convertedTime.type + ')';
      }

      query = query.replace(func, funcReplace);
      samplingRegexResult = this.TIME_SAMPLING_REGEX.exec(query);
    }
    return query;
  }

  /**
   * Convert Grafana time to Griddb time format use in time_sampling()
   * Only support ms, s, m, h, d, w, M, Y
   * Example:
   * Input: 3d
   * Output: {value: 3, type: DAY}
   *
   * @param {string} time converted time
   * @returns GridDB time sampling interval
   * @memberof TemplateProcessor
   */
  public convertTimeInTimeSampling(time: string) {
    const timeType: string = this.getGrafanaTimeType(time);
    const prefix: string = '' + time.substring(0, time.length - timeType.length).trim();
    const timeNumber: number = +prefix;

    let type = '';
    let value: number = 0;

    if (!isNaN(timeNumber)) {
      value = +timeNumber;
    }

    switch (timeType) {
      case GridDBConstant.GRAFANA_TIME_UNITS_TYPE.years: {
        value = value * 365;
        type = GridDBConstant.GRIDDB_TIMESAMPLING_TYPE.day;
        break;
      }
      case GridDBConstant.GRAFANA_TIME_UNITS_TYPE.months: {
        value = value * 30;
        type = GridDBConstant.GRIDDB_TIMESAMPLING_TYPE.day;
        break;
      }
      case GridDBConstant.GRAFANA_TIME_UNITS_TYPE.weeks: {
        value = value * 7;
        type = GridDBConstant.GRIDDB_TIMESAMPLING_TYPE.day;
        break;
      }
      case GridDBConstant.GRAFANA_TIME_UNITS_TYPE.days: {
        type = GridDBConstant.GRIDDB_TIMESAMPLING_TYPE.day;
        break;
      }
      case GridDBConstant.GRAFANA_TIME_UNITS_TYPE.hours: {
        type = GridDBConstant.GRIDDB_TIMESAMPLING_TYPE.hour;
        break;
      }
      case GridDBConstant.GRAFANA_TIME_UNITS_TYPE.minutes: {
        type = GridDBConstant.GRIDDB_TIMESAMPLING_TYPE.minute;
        break;
      }
      case GridDBConstant.GRAFANA_TIME_UNITS_TYPE.seconds: {
        type = GridDBConstant.GRIDDB_TIMESAMPLING_TYPE.second;
        break;
      }
      case GridDBConstant.GRAFANA_TIME_UNITS_TYPE.millisecond: {
        type = GridDBConstant.GRIDDB_TIMESAMPLING_TYPE.millisecond;
        break;
      }
      default: {
        break;
      }
    }

    // Input: 3d
    // Output: {value: 3, type: DAY}
    return { value: value, type: type };
  }

  /**
   * Convert grafana date to timestamp of griddb
   *
   * Input: Moment date
   * Output: GridDB TIMESTAMP date format: TIMESTAMP(YYYY-MM-DDTHH:mm:ss:SSSZ)
   *
   * @param date Moment date
   * @returns String with GridDB TimeStamp expression
   */
  public convertGrafanaTimeToGridDBTimestamp(date: Moment) {
    let converted: string = '';
    if (date) {
      converted = date.utc().format('YYYY-MM-DDTHH:mm:ss.SSS');
      converted = 'TIMESTAMP(\'' + converted + 'Z\')';
    }
    return converted;
  }

  /**
   * Store raw value for micro: $__timeFilter and
   *
   * Example:
   * [{name:  $__timeFilter, star_time: TIMESTAMP('2018-11-26T12:05:10.058Z'), end_time: TIMESTAMP('2018-11-26T12:05:10.058Z')}]
   * TQL Begin: select * from container_1 where $__timeFilter
   * TQL After: select * from container_1 where $__timeColumn >  $__timeFrom AND  $__timeColumn <  $__timeTo
   *
   * @param query query to format
   * @param timeColumn Time column name
   * @returns Query after replace time filter macro
   */
  public formatTimeFilterMacro(query: string, timeColumn: string) {
    const dumpTimeFilter = '(' + timeColumn + ' > $__timeFrom AND ' + timeColumn + ' < $__timeTo)';
    query = query.replace(this.TIME_FILTER_REGEX, dumpTimeFilter);
    return query;
  }

  /**
   * Format for macro $__rangeFilter
   *
   * Input:
   * $__rangeFilter
   *
   * Output:
   * (startTime > = $__timeFrom AND startTime <= $__timeTo) OR (endTime > = $__timeFrom AND endTime <= $__timeTo)
   *
   * @param query Query is formatted
   * @param startTime Start time column
   * @param endTime End time column
   * @returns Query after replace time range macro
   * @memberof TemplateProcessor
   */
  public formatTimeRangeMacro(query: string, startTime: string, endTime: string) {
    if (startTime && endTime) {
      const dumpTimeFilter = '((' + startTime + ' >= $__timeFrom AND ' + startTime + ' <= $__timeTo) OR (' + endTime + ' >= $__timeFrom AND ' + endTime + ' <= $__timeTo))';
      query = query.replace(this.TIME_RANGE_FILTER_REGEX, dumpTimeFilter);
    }

    return query;
  }

  /**
   * Convert grafana time to millisecond time
   *
   * Support convert from time type: ms, s, m, h, d
   * 1ms = 1ms
   * 1s = 1000ms
   * 1m = 60*1000ms
   * 1h = 60*60*1000s
   * 1d = 24*60*60*1000s
   *
   * Example:
   * If interval is set is 30s => convert to 30 * 1000 ms
   * Else, interval is set is 30ms => convert to 30ms
   *
   * @param time Time interval in Grafana format
   * @returns time Time interval in millisecond unit
   * @memberof TemplateProcessor
   */
  public convertTimeToMillisecond(time: string): number {
    let millisecond: number = 0;
    let prefix = '';
    const timeType = this.getGrafanaTimeType(time);

    if (!time) {
      return -1;
    }

    if (time && time.length > 1) {
      prefix = time.substring(0, time.length - 1);
    }

    if (timeType === GridDBConstant.GRAFANA_TIME_UNITS_TYPE.seconds) {
      millisecond = +prefix * 1000;
    } else if (timeType === GridDBConstant.GRAFANA_TIME_UNITS_TYPE.minutes) {
      // If input date is 1m
      millisecond = +prefix * 60 * 1000;
    } else if (timeType === GridDBConstant.GRAFANA_TIME_UNITS_TYPE.hours) {
      // If input date is 1h
      millisecond = +prefix * 60 * 60 * 1000;
    } else if (timeType === GridDBConstant.GRAFANA_TIME_UNITS_TYPE.days) {
      // If input date is 1d
      millisecond = +prefix * 24 * 60 * 60 * 1000;
    } else if (timeType === GridDBConstant.GRAFANA_TIME_UNITS_TYPE.millisecond) {
      // If input date is 1sm
      millisecond = +time.substring(0, time.length - 2);
    } else {
      // Invalid format
      millisecond = -1;
    }

    return millisecond;
  }

  /**
   * Format query with all special variable defined by GridDB Plugin
   *
   * @param query Query is formatted
   * @param minInterval Min interval is setting in datasource (ms)
   * @param timeColumn Time column name
   * @param options Option setting
   * @returns Query after replace all special variables
   * @memberof TemplateProcessor
   */

  public formatSpecialVariables(query: string, minInterval: string, timeRange: any): string {

    // Replace $__interval
    const interval: number = timeRange.intervalMs ? timeRange.intervalMs : '0';
    const minIntervalMs: number = this.convertTimeToMillisecond(minInterval);
    const intervalMs: number = interval < minIntervalMs ? minIntervalMs : interval;
    const intervalUsed = '' + intervalMs + ', ' + GridDBConstant.GRIDDB_TIMESAMPLING_TYPE.millisecond;
    const minIntervalUsed = '' + minIntervalMs + ', ' + GridDBConstant.GRIDDB_TIMESAMPLING_TYPE.millisecond;
    query = query.replace(this.INTERVAL_REGEX, intervalUsed);

    // Replace $__minInterval
    query = query.replace(this.MIN_INTERVAL_REGEX, minIntervalUsed);

    if (timeRange.range) {
      // Replace $__timeFrom
      const timeFromUsed = this.convertGrafanaTimeToGridDBTimestamp(timeRange.range.from);
      query = query.replace(this.TIME_FROM_REGEX, timeFromUsed);

      // Replace $__timeTo
      const timeToUsed = this.convertGrafanaTimeToGridDBTimestamp(timeRange.range.to);
      query = query.replace(this.TIME_TO_REGEX, timeToUsed);
    }

    return query;
  }

  /**
   * Format variables which is created manually by user
   *
   * @param {*} templateSrv Template service of Grafana core
   * @param {*} scopedVars Scoped variables service of Grafana
   * @param {string} query input query
   * @returns Query after replace all user variables
   * @memberof TemplateProcessor
   */
  public formatCustomVariables(templateSrv: any, scopedVars: any, query: string) {
    return templateSrv.replace(query, scopedVars, this.interpolateQueryStr);
  }

  /**
   * Replace user variable with corresponding value. Input for Grafana templateSrv
   * If variable is not multiple values and select all, replace with the value
   * If variable is multiple values or select all, replace with the follow pattern ( value 1| value 2| value 3) (Follow Grafana format)
   *
   * @private
   * @param {*} value value of user variable
   * @param {*} variable user variable object
   * @returns string use to replace for the variable
   * @memberof TemplateProcessor
   */
  private interpolateQueryStr(value, variable) {
    // if no multi or include all do not regexEscape
    if (!variable.multi && !variable.includeAll) {
      return value;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value instanceof Array && value.length === 1) {
      return value[0];
    }

    const escapedValues = value.map((x) => x.replace(/[\\^$*+?.()|[\]{}\/]/g, '\\$&'));
    return '(' + escapedValues.join('|') + ')';
  }

  /**
   * Return type of time from Grafana time interval format
   *
   * @param {string} time in Grafana format (y, M, w, d, h, m, s and ms)
   * @returns {string} Type of time interval (year, month, week, day, hour, second and millisecond)
   * @memberof TemplateProcessor
   */
  private getGrafanaTimeType(time: string): string {
    if (!time) {
      return '';
    } else {
      if (time.match(this.MS_DATE_TYPE_REGEX)) {
        return GridDBConstant.GRAFANA_TIME_UNITS_TYPE.millisecond;
      } else if (time.match(this.S_DATE_TYPE_REGEX)) {
        return GridDBConstant.GRAFANA_TIME_UNITS_TYPE.seconds;
      } else if (time.match(this.M_DATE_TYPE_REGEX)) {
        return GridDBConstant.GRAFANA_TIME_UNITS_TYPE.minutes;
      } else if (time.match(this.H_DATE_TYPE_REGEX)) {
        return GridDBConstant.GRAFANA_TIME_UNITS_TYPE.hours;
      } else if (time.match(this.D_DATE_TYPE_REGEX)) {
        return GridDBConstant.GRAFANA_TIME_UNITS_TYPE.days;
      } else if (time.match(this.W_DATE_TYPE_REGEX)) {
        return GridDBConstant.GRAFANA_TIME_UNITS_TYPE.weeks;
      } else if (time.match(this.MONTH_DATE_TYPE_REGEX)) {
        return GridDBConstant.GRAFANA_TIME_UNITS_TYPE.months;
      } else if (time.match(this.Y_DATE_TYPE_REGEX)) {
        return GridDBConstant.GRAFANA_TIME_UNITS_TYPE.years;
      } else {
        throw { message: 'Cannot detect format of grafana time' };
      }
    }
  }
}
