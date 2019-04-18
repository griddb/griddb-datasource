import * as _ from 'lodash';
import { GridDBConstant } from '../../util/griddb_constant';

/**
 * Format response of query in variables query function
 *
 * @export
 * @class VariablesQueryFormatter
 */
export default class VariablesQueryFormatter {

  /**
   * Parse response of data in function Variables
   * For each response and different type to parse response
   *
   * @param {*} queryType Type of query. Support 3 types: CONTAINERS, COLUMNS and DATA
   * @param {*} response Response of query
   * @returns Formated data. Variable list in Grafana format
   * @memberof VariablesFormatter
   */
  public format(queryType: any, response: any) {

    let options: any;
    switch (queryType) {
      case GridDBConstant.VARIABLE_QUERY_TYPES.GET_DATA: {
        const results = response[0];
        options = this.getOptionsForDATAQuery(results);
        break;
      }
      case GridDBConstant.VARIABLE_QUERY_TYPES.GET_ALL_CONTAINERS: {
        options = this.getOptionsForCONTAINERSQuery(response);
        break;
      }
      case GridDBConstant.VARIABLE_QUERY_TYPES.GET_ALL_COLUMNS: {
        options = this.getOptionsForCOLUMNSQuery(response);
        break;
      }
      default: {
        options = [];
      }
    }
    return options;
  }

  /**
   * Format response with type is get Data
   * @param results Result of query get DATA
   * @returns variable list in Grafana format
   */
  public getOptionsForDATAQuery(results): any {
    // Check data is available or not
    if (!results || !results.columns || !results.results) {
      return [];
    }

    const res = {};
    // Loop all rows in result
    _.each(results.results, (row) => {
      this.addUnique(res, row[0]);
    });

    return _.map(res, (value) => {
      return { text: '' + value };
    });
  }

  /**
   *
   * Format response with type is get container list
   * Input:
   * Response from GridDB server below:
   * {
   * “names” : [
   *    “container1”,
   *    “container2”,
   *    “timeseries1”
   * ],
   * “total” : 1000125,
   * “offset” : 0,
   * “limit” : 3
   * }
   * @param {*} results Result of query get CONTAINERS
   * @returns {*} variable list in Grafana format
   */
  public getOptionsForCONTAINERSQuery(results: any): any {
    if (!results || !results.names || results.names.length === 0) {
      return [];
    }

    const res = {};
    _.each(results.names, (row) => {
      const containerName = row.trim();
      this.addUnique(res, containerName);

    });

    return _.map(res, (value) => {
      return { text: '' + value };
    });
  }

  /**
   *
   * Format response with type is get column list
   * Input:
   * Response from GridDB server below:
   * {
   *    “container_name” : “container1”,
   *    “container_type” : “collection”,
   *    “rowkey” : true,
   *    "columns" : [
   * 		{"name": "date", "type": "TIMESTAMP", “index”, “tree”},
   * 		{"name": "value", "type": "DOUBLE", “index”, “none”},
   * 		{"name": "str", "type": "STRING", “index”, “none”}
   * 	 ]
   * }
   * Output:
   * [
   *    {text : date}
   *    {text : value}
   *    {text : str}
   * ]
   * @param {*} results Result of query get COLUMNS
   * @returns {*} variable list in Grafana format
   */
  public getOptionsForCOLUMNSQuery(results: any): any {
    if (!results || !results.columns || results.columns.length === 0) {
      return [];
    }

    const res = {};
    _.each(results.columns, (row) => {
      const name = row.name.trim();
      this.addUnique(res, name);
    });

    return _.map(res, (value) => {
      return { text: '' + value };
    });
  }

  /**
   * Update value to object
   *
   * @param {{ [x: string]: any; }} object object
   * @param {(string | number)} value value
   */
  private addUnique(object: { [x: string]: any; }, value: string | number) {
    object[value] = value;
  }

}
