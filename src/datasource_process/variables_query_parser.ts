import { GridDBConstant } from '../util/griddb_constant';

/**
 * Parse query before send to request in variables function
 *
 * @export
 * @class VariablesQueryParser
 */
export default class VariablesQueryParser {
  /**
   * Query to parse
   *
   * @type {string}
   * @memberof VariablesQueryParser
   */
  public query: string;

  /**
   * Regex to get all column from COLUMNS query
   * Input: $griddb_column_list(container_abc)
   * Output: container_abc
   *
   * @memberof VariablesQueryParser
   */
  public allColumnsRegex = /^\$griddb_column_list\((\w+)\)$/g;

  /**
   * Regex to parse DATA query
   * Input: TQL = {TQL_query} | column = {column name}
   * Output: TQL and check any query has matching with this format yes or not
   *
   * @memberof VariablesQueryParser
   */
  public getDataRegex = /^\$griddb_query_data\(([^,]+),([^,+]+(?:\+[^,+]+)*),(.*)\)$/g;

  /**
   * Get all container in database
   *
   * @memberof VariablesQueryParser
   */
  public getAllContainerRegex = '$griddb_container_list';

  /**
   * constructor
   * variable query use the following GridDB Plugin defined syntax:
   * $griddb_container_list : query container list
   * $griddb_column_list: query column list
   * $griddb_query_data: query data with TQL
   * @param query input query for variable query
   *
   */
  constructor(query: string) {
    this.query = query;
  }

  /**
   * Detect type of query.
   * Only support types: CONTAINERS, DATA, COLUMNS
   *
   * @returns type of query
   * @memberof VariablesQueryParser
   */
  public detectQueryType() {

    let type = '';
    this.query = this.query.trim();
    if (this.query === this.getAllContainerRegex) {
      type = GridDBConstant.VARIABLE_QUERY_TYPES.GET_ALL_CONTAINERS;

    } else if (this.query.match(this.allColumnsRegex)) {
      type = GridDBConstant.VARIABLE_QUERY_TYPES.GET_ALL_COLUMNS;

    } else if (this.query.match(this.getDataRegex)) {
      type = GridDBConstant.VARIABLE_QUERY_TYPES.GET_DATA;

    } else {
      const msg = 'Query is wrong format. Please choose one of three formats below:'
        + '\n1. $griddb_container_list. '
        + '\n2. $griddb_column_list({container name})'
        + '\n3. $griddb_query_data({container name}, {columns}, {TQL})';
      throw { message: msg };
    }
    return type;
  }

  /**
   * Parse variable query base on type and return object result
   *
   * @returns object store variable query information
   * @memberof VariablesQueryParser
   */
  public parse() {
    const type = this.detectQueryType();
    let parseObj: any = {};

    switch (type) {
      case GridDBConstant.VARIABLE_QUERY_TYPES.GET_ALL_CONTAINERS: {
        parseObj = {
          type: type,
        };
        break;
      }
      case GridDBConstant.VARIABLE_QUERY_TYPES.GET_ALL_COLUMNS: {
        const tmp: any = this.allColumnsRegex.exec(this.query);
        const container = ('' + tmp[1]).trim();
        if (!container) {
          throw { message: 'Container name must be not empty or null' };
        }

        parseObj = {
          type: type,
          container: container,
        };
        break;
      }
      case GridDBConstant.VARIABLE_QUERY_TYPES.GET_DATA: {
        // Parse query
        const dataRegexResult: any = this.getDataRegex.exec(this.query);

        // Get TQL query
        const tql = ('' + dataRegexResult[3]).trim();
        if (!tql) {
          throw { message: 'TQL statement must be not empty or null' };
        }

        // Parse to get container from TQL
        const containerRegexResult: string = dataRegexResult[1].trim();
        if (!containerRegexResult) {
          throw { message: 'Container name must be not empty or null' };
        }

        // Parse to get column list
        const columnsRegexResult: string = dataRegexResult[2].trim();
        const columns = this.getColumns(columnsRegexResult);
        if (!columns || columns.length === 0) {
          throw { message: 'Column name must be not empty or null' };
        }

        parseObj = {
          type: type,
          container: containerRegexResult,
          columns: columns,
          tql: tql,
        };
        break;
      }
    }

    return parseObj;
  }

  /**
   * columnsRegexResult is column is parsed from get query data
   * If columnsRegexResult is null or empty, return null
   * If columnsRegexResult is available
   *  1. Split column list by + and trim all columns
   *  2. Check if column is empty, throw exception
   *  3. Remove duplicate column name
   *
   * @private
   * @param {*} columnsRegexResult
   * @returns Column list is separate from query data format
   * @memberof VariablesQueryParser
   */
  private getColumns(columnsRegexResult: string) {
    let columns: string[] = [];
    if (columnsRegexResult) {
      columns = columnsRegexResult.split('+').map((column) => column.trim());

      // Check list has empty column or not
      const emptyCol = columns.filter((x) => !x).length;
      if (emptyCol > 0) {
        throw { message: 'Column name must be not empty or null' };
      }

      // Remove duplicate item
      columns = [...new Set(columns)];
    } else {
      return null;
    }

    return columns;

  }
}
