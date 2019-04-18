import { GridDBConstant } from '../../util/griddb_constant';
import * as _ from 'lodash';

/**
 * Format response of TQL query in query data function
 *
 * @export
 * @class DataQueryFormatter
 */
export default class DataQueryFormatter {

  /**
   * Column regex for alias
   *
   * @memberof DataQueryFormatter
   */
  public ALIAS_COLUMN_REGEX = /(\$__col)/g;

  /**
   * Container regex
   *
   * @memberof TemplateProcessor
   */
  public CONTAINER_REGEX = /(\$__container)/g;

  /**
   * Refine response before format:
   *  + Move time column to the last position. (Grafana format request "time column" at the last position).
   *
   * @param {any[]} formats Information to refine response
   * @param {any[]} response Response to parse
   * @memberof DataQueryFormatter
   */
  public refine(formats: any[], response: any[]) {
    formats.forEach((element, index) => {
      let timeCol: string = '';
      const cols: any[] = response[index].columns;
      const format = element.data_format;

      if (element.raw && format === GridDBConstant.FORMAT.timeSeries) {
        const tmp = cols.filter((x) => x.type === 'TIMESTAMP');
        timeCol = tmp && tmp.length === 1 ? tmp[0].name : '';
      } else if (!element.raw && format === GridDBConstant.FORMAT.timeSeries) {
        timeCol = element.timeColumn;
      } else if (format === GridDBConstant.FORMAT.table) {
        return;
      } else {
        throw { message: 'Cannot detect format of data' };
      }

      const newResponse = this.swap(timeCol, response[index]);
      response[index] = newResponse;
    });
  }

  /**
   * Convert data to display on graph or table
   *
   * 1. Loop all response
   *  1. If row data available
   *    1. If format of response is time series, convert data to time series format
   *    2. If format of response is table, convert data to table format
   *    3. Else, show error message
   *
   * @param requests Request to get data
   * @param response Response data
   * @param format Format of query:  { raw, data_format, alias, timeColumn }
   * @returns {*} Data is formated base on format
   * @memberof DataQueryFormatter
   */
  public format(requests: any[], response: any, format: any[]): any {
    let result: any[] = [];
    const containerRequest = requests.map((x) => x.name);

    // Loop all response data
    // For each query
    response.forEach((element: { columns: string[]; results: any; }, index: number) => {
      const columns: string[] = element.columns;
      const rows = element.results;
      const container = containerRequest[index];
      const alias = format[index].alias;

      if (rows && rows.length > 0) {
        if (format[index].data_format === GridDBConstant.FORMAT.timeSeries) {
          result = result.concat(this.convertToTimeSeriesData(columns, container, rows, alias));
        } else if (format[index].data_format === GridDBConstant.FORMAT.table) {
          result = result.concat(this.convertToTableData(columns, container, rows, alias));
        } else {
          throw { message: 'System not support this format' };
        }
      }

    });
    return result;
  }

  /**
   * Convert data is timeseries format
   *
   * 1. Loop all columns
   *  1. Ignore last column (time column)
   *  2. Get graph line from column, container and alias
   *  3. Loop each rows in response
   *    1. Convert timestamp to epoch time
   *    2. Set data for datapoints
   *
   * Expect output:
   * [
   *  {
   *    "target":"upper_75",
   *    "datapoints":[
   *          [622, 1450754160000],
   *          [365, 1450754220000]
   *      ]
   *   },
   *   {
   *      "target":"upper_90",
   *      "datapoints":[
   *          [861, 1450754160000],
   *          [767, 1450754220000]
   *        ]
   *    }
   *  ]
   * @param columns List columns
   * @param container Container name
   * @param rows List rows
   * @returns {*} Data is formated to time series format
   * @memberof DataQueryFormatter
   */
  public convertToTimeSeriesData(columns: any[], container: string, rows: any[], alias?: string): any {
    const result: any[] = [];
    if (columns.length < 2 || (rows && rows[0].length < 2)) {
      throw { message: 'Not enough data to draw Graph' };
    }

    columns.forEach((column, index) => {
      if (index === columns.length - 1) {
        return '';
      }

      const responseIndex: any = {
        target: '',
        datapoints: [],
      };

      responseIndex.target = this.getGraphLineName(column.name, container, alias);

      let j: number;
      for (j = 0; j < rows.length; j++) {
        const temp = rows[j];
        const time = this.convertLocalTimeStampToEpochTime(temp[columns.length - 1]);
        responseIndex.datapoints.push([temp[index], time]);
      }

      result.push(responseIndex);
    });
    return result;
  }

  /**
   * Convert data to table format
   *
   * 1. Loop all columns
   *  1. Get graph line name from column, container and alias
   * 2. Get data and type for response
   *
   * Expect output:
   * [
   * {
   *  "columns": [
   *   {
   *      "text": "Time",
   *    },
   *    {
   *      "text": "mean",
   *    }
   *  ],
   *  "rows": [
   *      [
   *          1457425380000,
   *          null
   *      ],
   *      [
   *          1457425370000,
   *          1002.76215352,
   *      ],
   *    ],
   *  "type": "table"
   *    }
   *  ]
   * @param columns List columns
   * @param container Container name
   * @param rows List rows
   * @returns {*} Data is formated to table format
   * @memberof DataQueryFormatter
   */
  public convertToTableData(columns: any[], container: string, rows: any[], alias?: string): any {
    const responseIndex: any = {};
    const columnsIndex: any[] = [];

    columns.forEach((column) => {
      const columnName = this.getGraphLineName(column.name, container, alias);
      const obj = { text: columnName };
      columnsIndex.push(obj);
    });

    responseIndex['columns'] = columnsIndex;
    responseIndex['rows'] = rows.map((x) => x.splice(0, columns.length));
    responseIndex['type'] = 'table';

    return responseIndex;
  }

  /**
   * Format timestamp (YYYY-MM-DDTHH:mm:ss:SSSZ) format to epoch time
   *
   * @private
   * @param {string} timestamp
   * @returns date is converted to epoch time
   * @memberof DataQueryFormatter
   */
  private convertLocalTimeStampToEpochTime(timestamp: string) {
    return new Date(timestamp).getTime();
  }

  /**
   * Get graph line value from column name, container name and alias
   *
   * 1. If alias is specific and alias not match with column regex, set target of data is alias
   * 2. If alias is specific and alias match with column regex, replace column regex by column name after that set for target
   * 3. If alias is not specific, set target is combine of container name and column name
   *
   * @private
   * @param {string} column column name
   * @param {string} container container name
   * @param {string} [alias] alias value
   * @returns {string} graph line name
   * @memberof DataQueryFormatter
   */
  private getGraphLineName(column: string, container: string, alias?: string): string {
    let lineName = '';

    if (alias) {
      // Replace $__container
      if (alias.match(this.CONTAINER_REGEX)) {
        alias = alias.replace(this.CONTAINER_REGEX, container);
      }

      // Replace $__col
      if (alias && alias.match(this.ALIAS_COLUMN_REGEX)) {
        alias = alias.replace(this.ALIAS_COLUMN_REGEX, column);
      }

      lineName = alias;
    } else {
      lineName = container + '.' + column;
    }
    return lineName;
  }

  /**
   * Swap time column to last index for response
   *
   * @private
   * @param {any[]} timeCols
   * @param {*} response
   * @returns {*} Swap time column from anywhere to last position in response
   * @memberof DataQueryFormatter
   */
  private swap(timeCol: string, response: any): any {

    let columns: any[] = response.columns;
    const colNames: string[] = columns.map((x) => x.name);
    const rows: any[] = response.results;
    const fromIndex: number = colNames.indexOf(timeCol);

    columns = this.swapObj(columns, fromIndex, colNames.length);
    rows.forEach((row) => {
      row = this.swapObj(row, fromIndex, colNames.length);
    });

    response.columns = columns;
    response.results = rows;

    return response;
  }

  /**
   * Swap 2 element in list (list object or array)
   * Example:
   * Input:
   * arr: [1, 3, 4, 5]
   * swapObj (arr, 0, 1);
   *
   * Output:
   * arr: [3, 1, 4, 5]
   * @private
   * @param {any[]} array Array contains element
   * @param {number} fromIndex Index of first element
   * @param {number} toIndex Index of second element
   * @returns {any[]} Array after swap 2 elements
   * @memberof DataQueryFormatter
   */
  private swapObj(array: any[], fromIndex: number, toIndex: number): any[] {
    if (fromIndex > -1) {
      const tmp = array.splice(fromIndex, 1)[0];
      array.splice(toIndex, 1, tmp);
    }
    return array;
  }
}
