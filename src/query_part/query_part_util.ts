import { GridDBConstant } from '../util/griddb_constant';
/**
 * Util function for DataQueryCtrl class
 *
 * @export
 * @class GridDBPartUtil
 */
export default class GridDBPartUtil {

  /**
   * Convert from column name list to object to display in UI for where item
   *
   * @static
   * @param {any} columnList list column name
   * @returns  list object for where item
   * @memberof GridDBPartUtil
   */
  public static convertToWhereCondition(columnList) {
    if (columnList !== undefined && columnList.length > 0) {
      const whereCondition: any[] = [];
      columnList.forEach((element) => {
        whereCondition.push({ text: element.name, value: element.name });
      });
      return whereCondition;
    } else {
      return [];
    }
  }

  /**
   * Convert from column name list to object to display in UI for view column item
   *
   * @static
   * @param {any} columnList list column name
   * @returns list object for view column item
   * @memberof GridDBPartUtil
   */
  public static createDataForViewCol(columnList) {
    if (columnList !== undefined && columnList.length > 0) {
      const options: any[] = [];
      let dataForViewCol: any;
      columnList.forEach((element) => {
        options.push({ selected: false, text: element, value: element });
      });
      options.splice(0, 0, { selected: false, text: 'All', value: '$__all' });

      dataForViewCol = {
        options: options, tags: [],
        current: {},
        includeAll: true, multi: true,
      };
      return dataForViewCol;
    } else {
      return {};
    }
  }

  /**
   * Get List of view column in Timeseries format
   *
   * From input column list return list column which have type is numeric
   *
   * @static
   * @param {any} columnList list column name
   * @returns list column which have type is numeric
   * @memberof GridDBPartUtil
   */
  public static getViewColListinTimeSeries(columnList) {
    if (columnList !== undefined && columnList.length > 0) {
      const result: any[] = [];
      columnList.forEach((element) => {
        if (element.type === GridDBConstant.NUMBER_TYPE_GRIDDB.byte ||
          element.type === GridDBConstant.NUMBER_TYPE_GRIDDB.double ||
          element.type === GridDBConstant.NUMBER_TYPE_GRIDDB.float ||
          element.type === GridDBConstant.NUMBER_TYPE_GRIDDB.integer ||
          element.type === GridDBConstant.NUMBER_TYPE_GRIDDB.long ||
          element.type === GridDBConstant.NUMBER_TYPE_GRIDDB.short) {
          result.push(element.name);
        }
      });
      return result;
    } else {
      return [];
    }
  }

  /**
   * From string array, convert to segment array
   *
   * @static
   * @param {any} columnList list column name
   * @returns segment array
   * @memberof GridDBPartUtil
   */
  public static convertToSegmentFormat(columnList) {
    if (columnList !== undefined && columnList.length > 0) {
      const segmentFormat: any[] = [];
      columnList.forEach((element) => {
        segmentFormat.push({ text: element, value: element, fake: false });
      });
      return segmentFormat;
    } else {
      return [];
    }
  }

  /**
   * From string array, convert to object array
   *
   * @static
   * @param {any} containerNameList list container name
   * @returns list container object
   * @memberof GridDBPartUtil
   */
  public static convertListContainerToObject(containerNameList) {
    if (containerNameList !== undefined && containerNameList.length > 0) {
      const containerObjList: any[] = [];
      containerNameList.forEach((element) => {
        containerObjList.push({ text: element, value: element });
      });
      return containerObjList;
    } else {
      return [];
    }
  }
}
