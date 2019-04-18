import * as _ from 'lodash';
import GridDBPartUtil from './query_part_util';
import { GridDBConstant } from '../util/griddb_constant';

/**
 * Convert Select box mode to TQL Statement
 *
 * @export
 * @class GridDBQuery
 */
export default class GridDBQuery {

  /**
   * GridDB query control
   *
   * @type {any[]}
   * @memberof GridDBQuery
   */
  public whereParts: any[] = [];

  /**
   * Selected model from gui
   *
   * @type {any[]}
   * @memberof GridDBQuery
   */
  public selectModels: any[];

  /**
   * Scope variables of Grafana core
   *
   * @type {*}
   * @memberof GridDBQuery
   */
  public scopedVars: any;

  /**
   * GridDB Util
   *
   * @type {GridDBPartUtil}
   * @memberof GridDBQuery
   */
  public griddbUtil: GridDBPartUtil;

  /**
   * Target stored all information of query
   *
   * @private
   * @type {*}
   * @memberof GridDBQuery
   */
  private target: any;

  /**
   * Creates an instance of GridDBQuery.
   *
   * @param {*} target Stored information in GUI
   * @param {*} [scopedVars] Variables of Grafana core
   * @memberof GridDBQuery
   */
  constructor(target, scopedVars?) {
    this.target = target;
    this.scopedVars = scopedVars;
    this.griddbUtil = new GridDBPartUtil();
  }

  /**
   * Generate TQL query from Select box mode
   *
   * @returns
   * @memberof GridDBQuery
   */
  public render() {

    let query = '';
    if (this.target.rawQuery) {
      return this.target.query;
    }

    query = query + this.getSELECTCommand();
    query = query + this.getWHERECommand();
    query = query + this.getLimitCommand();
    this.target.griddbTQL = query;
    return query;
  }

  /**
   * If check box TIME_SAMPLING is checked  => Select $__timeSampling(*, $__interval)
   * If check box TIME_SAMPLING is un-check => Select *
   *
   * @returns Select statement
   * @memberof GridDBQuery
   */
  public getSELECTCommand(): string {
    let query = '';
    const selectTarget: boolean = this.target.griddbIsTimeSampling ? this.target.griddbIsTimeSampling : false;

    if (selectTarget) {
      query = query + '$__timeSampling(*, $__interval)';
    } else {
      query = query + '*';
    }

    const container = this.target.griddbContainer.text ? this.target.griddbContainer.text : '';
    return 'SELECT ' + query + ' FROM ' + container;
  }

  /**
   * Get condition for WHERE statement
   * Example:
   * WHERE column1 = 5
   * WHERE SUBSTRING(column1) LIKE 'test%'
   *
   * @returns WHERE statement
   * @memberof GridDBQuery
   */
  public getWHERECommand(): string {
    let query = '';
    if (this.target.griddbWheres && this.target.griddbWheres.length > 0) {
      const conditions = _.map(this.target.griddbWheres, (element, index) => {
        return this.renderTagCondition(element, index);
      });

      query = ' WHERE';
      conditions.forEach((element) => {
        query = query + element;
      });

      query = this.addTimeFilter(query, true);
    } else {
      query = this.addTimeFilter(query, false);
    }

    return query;
  }

  /**
   * Get limit and offset conditions
   * If no limit: ''
   * If has limit: LIMIT 10 or LIMIT 10 OFFSET 4
   *
   * @returns {string} LIMIT statement
   * @memberof GridDBQuery
   */
  public getLimitCommand(): string {
    let query = '';
    const limitNumber = this.target.griddbLimit;
    const limitOffset = this.target.griddbOffset;

    if (limitNumber !== null && !isNaN(Number(limitNumber))) {
      if (limitNumber < 0) {
        throw { message: 'Limit cannot smaller than 0' };
      }

      query = ' LIMIT ' + this.target.griddbLimit;

      if (limitOffset !== null && !isNaN(Number(limitOffset))) {

        if (limitOffset < 0) {
          throw { message: 'Offset cannot smaller than 0' };
        }

        query = query + ' OFFSET ' + this.target.griddbOffset;
      }
    }

    return query;

  }

  /**
   * Add time filter for query
   * 1. If time column is undefined, not add time filter
   * 2. If time column is available, check:
   *  1. If format is table and not select time column, not add time filter
   *  2. If format is table and select time column, add time filter
   *  3. If format is time series, add time filter
   * 2. Check 'AND' clause
   *  1. If where is selected and time filter is specific, add 'AND' clause
   *  2. If where is not selected and time filter is specific, add 'WHERE' clause
   *  3. Other, not add 'AND' clause
   *
   * @private
   * @param {string} query
   * @param {boolean} hasOtherCondition
   * @returns {string} query after add time filter
   * @memberof GridDBQuery
   */
  private addTimeFilter(query: string, hasOtherCondition: boolean): string {
    const timeColumn = (this.target && this.target.griddbTimeColumn) ? this.target.griddbTimeColumn.text : '';
    let andJoinClause = '';
    if (timeColumn) {
      let timeFilterClause = '(' + timeColumn + ' > $__timeFrom AND ' + timeColumn + ' < $__timeTo)';
      if (this.target.format === GridDBConstant.FORMAT.table && this.target.griddbTimeColumn.fake) {
        timeFilterClause = '';
      }

      if (hasOtherCondition && timeFilterClause) {
        andJoinClause = ' AND ';
      } else if (!hasOtherCondition && timeFilterClause) {
        timeFilterClause = ' WHERE ' + timeFilterClause;
      }
      query = query + andJoinClause + timeFilterClause;
    }
    return query;
  }

  /**
   * Render conditions for WHERE statement
   *
   * @private
   * @param {*} tag Store compare information
   * @param {*} index Remark conditions finish
   * @returns {string} Conditions clause
   * @memberof GridDBQuery
   */
  private renderTagCondition(tag, index): string {
    let str = '';
    const operator = tag.operator;
    const value = tag.value ? tag.value.trim() : '';
    const key: string = tag.key ? tag.key.trim() : '';
    let clause: string = '';

    if (index > 0) {
      str = ' ' + tag.condition;
    }

    if (value.toLowerCase() === 'null') {
      clause = this.getClauseForNullValue(key, operator, value);
    } else if (value.toLowerCase() === 'false' || value.toLowerCase() === 'true') {
      clause = this.getClauseForBooleanColumn(key, operator, value.toLowerCase());
    } else {
      clause = key + ' ' + operator + ' ' + value;
    }

    return str + ' ' + clause;
  }

  /**
   * Get clause condition if value is true or false
   * 1. If value is false
   *  1. If operator is '=' => NOT key
   *  2. If operator is '<>' => key
   * 2. If value is true
   *  1. If operator is '=' => key
   *  2. If operator is '<>' => NOT key
   * 3. Otherwise => key + operator + value
   *
   * @private
   * @param {*} value Right clause, value is true/false
   * @param {*} operator Operator
   * @param {*} key Left clause
   * @returns Clause is combine between key, operator and value
   * @memberof GridDBQuery
   */
  private getClauseForBooleanColumn(key: string, operator: string, value) {
    let clause = '';
    if (value === 'false') {
      if (operator === '=') {
        clause = 'NOT ' + key;
      } else if (operator === '<>') {
        clause = key;
      }
    } else if (value === 'true') {
      if (operator === '=') {
        clause = key;
      } else if (operator === '<>') {
        clause = 'NOT ' + key;
      }
    } else {
      clause = key + ' ' + operator + ' ' + value;
    }
    return clause;
  }

  /**
   * Get clause condition if value is null
   * 1. If operator is '=' => key is null
   * 2. If operator is '<>' => key is not null
   * 3. Otherwise => key +  operator + value
   *
   * @private
   * @param {string} key Left clause
   * @param {string} operator Operator
   * @param {string} value Right clause, value is null
   * @returns Clause is combine between key, operator and value
   * @memberof GridDBQuery
   */
  private getClauseForNullValue(key: string, operator: string, value: string) {
    let clause = '';
    if (operator === '=') {
      clause = key + ' IS null';
    } else if (operator === '<>') {
      clause = key + ' IS NOT null';
    } else {
      clause = key + ' ' + operator + ' ' + value;
    }
    return clause;
  }
}
