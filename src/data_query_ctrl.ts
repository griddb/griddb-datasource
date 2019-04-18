import { QueryCtrl } from 'grafana/app/plugins/sdk';
import GridDBQuery from './query_part/griddb_query';
import * as _ from 'lodash';
import { GridDBConstant } from './util/griddb_constant';
import GridDBPartUtil from './query_part/query_part_util';
/**
 * Handle all action in UI after get information to send to server
 *
 * @export
 * @class DataQueryCtrl
 */
/**
 * Controller object for data query view
 *
 * @export
 * @class DataQueryCtrl
 */
export class DataQueryCtrl extends QueryCtrl {
  /**
   * url to html file
   *
   * @static
   * @type {string}
   * @memberof DataQueryCtrl
   */
  public static templateUrl: string = 'partials/query.editor.html';
  /**
   * List container name
   *
   * @private
   * @type {any[]}
   * @memberof DataQueryCtrl
   */
  private griddbContainers: any[];
  /**
   * List of where segment
   *
   * @private
   * @type {any[]}
   * @memberof DataQueryCtrl
   */
  private griddbWhereSegments: any[];
  /**
   * Remove segment object
   *
   * @private
   * @type {*}
   * @memberof DataQueryCtrl
   */
  private removeTagFilterSegment: any;
  /**
   * GridDBQuery object which handle operator to render TQL query
   *
   * @private
   * @type {GridDBQuery}
   * @memberof DataQueryCtrl
   */
  private queryModel: GridDBQuery;
  /**
   * list of suggestion option for where item
   *
   * @private
   * @type {*}
   * @memberof DataQueryCtrl
   */
  private griddbWhereCondition: any;
  /**
   * List variable
   *
   * @private
   * @type {any[]}
   * @memberof DataQueryCtrl
   */
  private griddbVariables: any[];

  /**
   * Assign initial value for all variables by: default values or saved values or values from database
   * @param {*} $scope angularjs $scope service
   * @param {*} $injector angularjs $injector service
   * @param {*} templateSrv Grafana templateSrv service
   * @param {*} $q Promises implementation in angularjs
   * @param {*} uiSegmentSrv Grafana Segment service
   */
  /* mark for web pack build. Do not delete */
  /** @ngInject */
  constructor($scope: any, $injector: any, private templateSrv, private $q: any, private uiSegmentSrv) {
    super($scope, $injector);
    this.queryModel = new GridDBQuery(this.target, templateSrv);
    this.removeTagFilterSegment = uiSegmentSrv.newSegment({
      fake: true,
      value: '--remove--',
    });
    this.target = this.target;

    this.target.griddbWheres = this.target.griddbWheres || [];
    // object contain data about container after select
    this.target.griddbContainer = this.target.griddbContainer || { text: '--select container--', value: 'select-container' };
    this.target.griddbLimit = this.target.griddbLimit || 10000;
    this.target.griddbOffset = this.target.griddbOffset || 0;
    this.target.alias = this.target.alias || '';

    // list of all column in selected container
    this.target.griddbColumns = this.target.griddbColumns || [];
    // list of all avaiable view column in Time-Series mode
    this.target.griddbTimeSeriesViewCols = this.target.griddbTimeSeriesViewCols || [];
    // list of all avaiable view column in Table mode
    this.target.griddbTableViewCols = this.target.griddbTableViewCols || [];
    // object contain data of time column after select
    this.target.griddbTimeColumn = this.target.griddbTimeColumn || { text: '--select time column--', value: 'time-column', fake: true };
    // list view column name after select
    this.target.griddbSelectedViewCols = this.target.griddbSelectedViewCols || [];
    // object contain data to display in 'View column' field
    this.target.griddbViewColDisplayModel = this.target.griddbViewColDisplayModel || { current: { value: ['$__all'], text: 'All' } };
    // list of all time column in selected container
    this.target.griddbTimeCols = this.target.griddbTimeCols || [];
    this.target.griddbNotTimeCols = this.target.griddbNotTimeCols || [];
    if (this.target.griddbNotSpeContAndColm === undefined) {
      this.target.griddbNotSpeContAndColm = true;
    }
    // check if select option is timesapling or not
    this.target.griddbIsTimeSampling = this.target.griddbIsTimeSampling || false;

    this.$scope = $scope;
    this.target.griddbWhereCondition = this.target.griddbWhereCondition || [];
    this.target.griddbSelectedContainerType = this.target.griddbSelectedContainerType || '';
    // this.target.format = this.target.format || 'time-series';
    this.target.query = this.target.query || 'SELECT *';
    this.target.rawQuery = this.target.rawQuery || false;
    if (this.panelCtrl.panel.type === 'table') {
      this.target.format = 'table';
    } else {
      this.target.format = 'time-series';
    }

    this.getGriDBVariable();
    this.getContainers();
    this.initialDefaultValues();
    this.fixSegments();

  }

  /*************************************************action Functions */

  /**
   * Action when user update view column list
   *
   * If user select option All then view column will be all columns in list
   * Else view column will be selected columns by user
   *
   * @param {*} griddbSelectedCol view column model
   * @memberof DataQueryCtrl
   */
  public updateViewCol(griddbSelectedCol: any) {
    if (griddbSelectedCol !== undefined) {
      if (griddbSelectedCol.current.value instanceof Array) {
        if (griddbSelectedCol.options[0].selected) {
          if (this.target.format === GridDBConstant.FORMAT.timeSeries) {
            this.target.griddbSelectedViewCols = this.target.griddbTimeSeriesViewCols;
          }
          if (this.target.format === GridDBConstant.FORMAT.table) {
            this.target.griddbSelectedViewCols = this.target.griddbTableViewCols;
          }
        } else {
          this.target.griddbSelectedViewCols = griddbSelectedCol.current.value;
        }
      } else {
        this.target.griddbSelectedViewCols = [griddbSelectedCol.current.text];
      }
      this.panelCtrl.refresh();
    } else {
      throw { message: 'Update view column fail.' };
    }

  }

  /**
   * Action when user click toggle button
   *
   * If current mode is raw query, call function to render TQL query
   * Update raw query status
   * Update format status
   *
   * @memberof DataQueryCtrl
   */
  public toggleEditorMode() {
    if (!this.target.rawQuery) {
      this.target.query = this.queryModel.render();
    }
    this.target.rawQuery = !this.target.rawQuery;
    if (this.panelCtrl.panel.type === 'table') {
      this.target.format = 'table';
    } else {
      this.target.format = 'time-series';
    }
  }

  /**
   * Action when user change container
   *
   * Check if both of container and time column is specify or not
   * If selected item is a variable, assign selected container is returned container by variable, else is selected item
   * Call function to get column list by selected container
   * Refresh panel
   *
   * @memberof DataQueryCtrl
   */
  public onChangeContainer(option) {
    if (option === undefined) {
      return;
    } else {
      let selectedContainer: any;
      this.checkIfSpecifyContainerAndTimeColumn();
      let index = -1;
      for (let i = 0; i < this.griddbVariables.length; i++) {
        if (this.griddbVariables[i].text === this.target.griddbContainer.text && this.griddbVariables[i].value === this.target.griddbContainer.value) {
          index = i;
        }
      }
      if (index >= 0) {
        const selectVariable = this.templateSrv.variables[index].current;
        if (selectVariable.text === 'All' && selectVariable.value === '$__all') {
          selectedContainer = '';
        } else {
          selectedContainer = selectVariable.text;
        }
      } else {
        selectedContainer = this.target.griddbContainer.text;
      }

      this.getColumns(selectedContainer);
      this.panelCtrl.refresh();
    }

  }

  /**
   * Action when change time column
   *
   * Check if both of container and time column is specify or not
   * If both of container and time column were specified, call function to update list column
   * Refresh panel
   *
   * @memberof DataQueryCtrl
   */
  public onChangeColumn(option) {
    if (option === undefined) {
      return;
    } else {
      this.checkIfSpecifyContainerAndTimeColumn();
      if (!this.target.griddbNotSpeContAndColm) {
        if (this.target.griddbSelectedViewCols.length === 0) {
          this.updateColumnList();
        }
      }
      this.panelCtrl.refresh();
    }
  }

  /**
   * Action when update where segment
   *
   * Update Where segment array
   * If type of input segment is remove, remove from segment array
   * If type of input segment is plus-button, add more segments with default values
   * If input segment is last segment, add more new plug button segment to last
   * Call function to rebuild where segment in target
   *
   * @param {any} segment selected segment
   * @param {any} index index of selected segment
   * @memberof DataQueryCtrl
   */
  public whereSegmentUpdated(segment, index) {
    if (segment !== undefined && index >= 0) {
      this.griddbWhereSegments[index] = segment;

      if (segment.value === this.removeTagFilterSegment.value) {
        this.griddbWhereSegments.splice(index, 3);
        if (this.griddbWhereSegments.length === 0) {
          this.griddbWhereSegments.push(this.uiSegmentSrv.newPlusButton());
        }
        if (this.griddbWhereSegments.length > 2) {
          this.griddbWhereSegments.splice(Math.max(index - 1, 0), 1);
          if (this.griddbWhereSegments[this.griddbWhereSegments.length - 1].type !== 'plus-button') {
            this.griddbWhereSegments.push(this.uiSegmentSrv.newPlusButton());
          }
        }
      }
      if (segment.type === 'plus-button') {
        if (index > 2) {
          this.griddbWhereSegments.splice(index, 0, this.uiSegmentSrv.newCondition('AND'));
        }
        this.griddbWhereSegments.push(this.uiSegmentSrv.newOperator('='));
        this.griddbWhereSegments.push(this.uiSegmentSrv.newFake('--input value--', 'value', 'query-segment-value'));
        segment.type = 'key';
        segment.cssClass = 'query-segment-key';
      }

      if (index + 1 === this.griddbWhereSegments.length && index >= 2) {
        this.griddbWhereSegments.push(this.uiSegmentSrv.newPlusButton());
      }

      this.rebuildTargetWhereConditions();
    } else {
      throw { message: 'Update where segment fail.' };
    }
  }

  /*************************************************GetOptions List Functions */

  /**
   * Get container list from database
   *
   * Call API to get container list
   * Convert respond data to object to display in UI
   * Concat list object after convert to list variable object
   *
   * @memberof DataQueryCtrl
   */
  public getContainers() {
    this.datasource.getContainerList()
      .then((res) => {
        this.griddbContainers = GridDBPartUtil.convertListContainerToObject(res.names);
        this.griddbContainers = this.griddbVariables.concat(this.griddbContainers);
      })
      .catch((err) => {
        throw { message: 'Can not get container list.' };
      });
  }

  /**
   * Get column list in selected container
   *
   * Call function to revert all value to default
   * Call API to get column list
   * Assign respond data to necessary variable
   *
   * @param {any} selectedContainer selected container which were input by user in UI
   * @memberof DataQueryCtrl
   */
  public getColumns(selectedContainer) {
    this.revertAllValueToDefaultAfterChangeContainer();
    this.datasource.getColumnList(selectedContainer)
      .then((res) => {

        const columnList: any[] = [];
        const timeColumnList: any[] = [];
        res.columns.forEach((element) => {
          if (element.type === 'TIMESTAMP') {
            timeColumnList.push(element.name);
          }
          columnList.push(element.name);

        });
        this.target.griddbSelectedContainerType = res.container_type;
        this.target.griddbTableViewCols = columnList;
        this.target.griddbTimeSeriesViewCols = GridDBPartUtil.getViewColListinTimeSeries(res.columns);
        this.target.griddbColumns = GridDBPartUtil.convertToSegmentFormat(columnList);
        this.target.griddbTimeCols = GridDBPartUtil.convertToSegmentFormat(timeColumnList);
        this.target.griddbWhereCondition = GridDBPartUtil.convertToWhereCondition(res.columns);
        this.checkIfSpecifyContainerAndTimeColumn();
        if (!this.target.griddbNotSpeContAndColm) {
          this.updateColumnList();
        }
      });
  }

  /**
   * Get option for all Where segment type
   *
   * If both of container and time column were specified
   * If type of input segment is condition, all option is: NOT, AND, OR, XOR
   * If type of input segment is operator, all option is: =, >=, >, <=, <, <>, LIKE
   * If type of input segment is plus-button, all option is all column in selected container
   * If type of input segment is value, no option were suggested
   * If type of input segment is key, all option is: remove segment
   *
   * @param {any} segment selected segment
   * @param {any} index index of selected segment
   */
  public getWhereOption(segment, index) {
    if (segment !== undefined && index >= 0) {
      if (!this.target.griddbNotSpeContAndColm) {
        if (segment.type === 'condition') {
          return this.$q.when([this.uiSegmentSrv.newSegment('AND'),
          this.uiSegmentSrv.newSegment('OR'),
          this.uiSegmentSrv.newSegment('XOR'),
          this.uiSegmentSrv.newSegment('AND NOT'),
          this.uiSegmentSrv.newSegment('OR NOT'),
          this.uiSegmentSrv.newSegment('XOR NOT')]);
        }
        if (segment.type === 'operator') {
          return this.$q.when(this.uiSegmentSrv.newOperators(['=', '>=', '>', '<=', '<', '<>', 'LIKE']));
        }
        if (segment.type === 'plus-button') {
          return this.$q.when(this.target.griddbWhereCondition);
        }
        if (segment.type === 'value') {
          return this.$q.when([]);
        }
        if (segment.type === 'key') {
          const targetColumn = [segment];
          const columnList = this.target.griddbTableViewCols.filter((x) => x !== segment.value);
          const columnSegment = this.convertToWhereSegment(columnList);
          columnSegment.forEach((element) => {
            targetColumn.splice(0, 0, element);
          });
          targetColumn.splice(0, 0, this.removeTagFilterSegment);
          return this.$q.when(targetColumn);
        }
      }
    } else {
      throw { message: 'Can not get option for where.' };
    }
  }

  /**
   * Get variable list
   *
   * Get variable list from templateSrv Grafana service
   * Format for all variable in list
   *
   * @memberof DataQueryCtrl
   */
  public getGriDBVariable() {
    const variables = this.templateSrv.variables;
    const variableList: any[] = [];
    // const variableListObjFormat: any[] = [];
    variables.forEach((element) => {
      variableList.push({ text: '$' + element.name, value: '$' + element.name });
      // variableListObjFormat.push('/^$' + element.name + '$/');
    });
    this.griddbVariables = variableList;
  }

  /*************************************************Validate & Util Functions */

  /**
   * Check if both of container and time column were specified or not
   *
   * If format is time-series and both container and time column were selected, return true
   * If format is table and container were selected, return true
   *
   * @memberof DataQueryCtrl
   */
  public checkIfSpecifyContainerAndTimeColumn() {
    if (this.target.format === GridDBConstant.FORMAT.timeSeries) {
      if (this.target.griddbContainer.value !== 'select-container' && this.target.griddbTimeColumn.fake === false) {
        this.target.griddbNotSpeContAndColm = false;
      }
    }
    if (this.target.format === GridDBConstant.FORMAT.table) {
      if (this.target.griddbContainer.value !== 'select-container') {
        this.target.griddbNotSpeContAndColm = false;
      }
    }
  }

  /**
   * Revert all variables to default
   *
   * All variables will be reset to default or empty value
   *
   * @memberof DataQueryCtrl
   */
  public revertAllValueToDefaultAfterChangeContainer() {
    this.target.griddbViewColDisplayModel = {
      current: { value: ['$__all'], text: 'All' },
    };
    this.target.griddbTimeColumn = { text: '--select time column--', value: 'time-column', fake: true };
    this.target.griddbColumns = [];
    this.target.griddbSelectedContainerType = '';
    if (this.target.format === GridDBConstant.FORMAT.timeSeries) {
      this.target.griddbNotSpeContAndColm = true;
    }
    if (this.target.format === GridDBConstant.FORMAT.table) {
      this.target.griddbNotSpeContAndColm = false;
    }

    this.target.griddbNotTimeCols.splice(0, this.target.griddbNotTimeCols.length);
    if (this.griddbWhereSegments.length !== 0) {
      this.griddbWhereSegments.splice(0, this.griddbWhereSegments.length);
      this.griddbWhereSegments.push(this.uiSegmentSrv.newPlusButton());
    }
    this.target.griddbLimit = 10000;
    this.target.griddbOffset = 0;

    this.target.griddbTableViewCols = [];
    this.target.griddbTimeSeriesViewCols = [];
    this.target.griddbTimeCols = [];
    this.target.griddbWheres = [];
    this.target.griddbIsTimeSampling = false;
    this.target.griddbTQL = '';
    this.target.alias = '';
    this.target.griddbSelectedViewCols = [];
  }

  /**
   * Update all related variable after column list were updated
   *
   * Update data for view column option
   * Set default option for view column is All option
   * Update selected view column list
   *
   * @memberof DataQueryCtrl
   */
  public updateColumnList() {
    this.target.griddbSelectedViewCols = [];
    if (this.target.format === GridDBConstant.FORMAT.timeSeries) {
      this.target.griddbViewColDisplayModel = GridDBPartUtil.createDataForViewCol(this.target.griddbTimeSeriesViewCols);
    }
    if (this.target.format === GridDBConstant.FORMAT.table) {
      this.target.griddbViewColDisplayModel = GridDBPartUtil.createDataForViewCol(this.target.griddbTableViewCols);
    }

    this.target.griddbViewColDisplayModel.options[0].selected = true;
    this.target.griddbViewColDisplayModel.current = { value: ['$__all'], text: 'All' };
    for (let colIndex = 1; colIndex < this.target.griddbViewColDisplayModel.options.length; colIndex++) {
      this.target.griddbSelectedViewCols.push(this.target.griddbViewColDisplayModel.options[colIndex].text);
    }
  }

  /**
   * Init default value for segment
   *
   * @memberof DataQueryCtrl
   */
  public fixSegments() {
    const countWhere = this.griddbWhereSegments.length;
    const lastWhereSegment = this.griddbWhereSegments[Math.max(countWhere - 1, 0)];

    if (!lastWhereSegment || lastWhereSegment.type !== 'plus-button') {
      this.griddbWhereSegments.push(this.uiSegmentSrv.newPlusButton());
    }
  }

  /**
   * Convert from where segment array to normal array
   *
   * Loop all segment in where segment list,
   * group of condition, key, operator, value will be put on an object in normal list
   *
   * @memberof DataQueryCtrl
   */
  public rebuildTargetWhereConditions() {
    const wheres: any[] = [];
    let tagIndex = 0;
    let tagOperator = '';

    _.each(this.griddbWhereSegments, (segment2, index) => {

      if (segment2.type === 'key') {
        if (wheres.length === 0) {
          wheres.push({});
        }
        wheres[tagIndex].key = segment2.value;
      } else if (segment2.type === 'value') {
        tagOperator = wheres[tagIndex].operator;
        if (tagOperator) {
          this.griddbWhereSegments[index - 1] = this.uiSegmentSrv.newOperator(tagOperator);
          wheres[tagIndex].operator = tagOperator;
        }
        wheres[tagIndex].value = segment2.value;
      } else if (segment2.type === 'condition') {
        wheres.push({ condition: segment2.value });
        tagIndex += 1;
      } else if (segment2.type === 'operator') {
        wheres[tagIndex].operator = segment2.value;
      }
    });

    this.target.griddbWheres = wheres;
    this.panelCtrl.refresh();
  }

  /**
   * Re-create value for where segment in case have saved value
   *
   * If where segment have saved value
   * Loop all list to re-create where segment array
   *
   * @memberof DataQueryCtrl
   */
  public initialDefaultValues() {
    // where
    this.griddbWhereSegments = [];
    for (const where of this.target.griddbWheres) {

      if (where.condition) {
        this.griddbWhereSegments.push(this.uiSegmentSrv.newCondition(where.condition));
      }

      this.griddbWhereSegments.push(this.uiSegmentSrv.newKey(where.key));
      this.griddbWhereSegments.push(this.uiSegmentSrv.newOperator(where.operator));
      this.griddbWhereSegments.push(this.uiSegmentSrv.newKeyValue(where.value));
    }
  }

  public getCollapsedText() {
    return new GridDBQuery(this.target).render();
  }

  /**
   * With each item in columnList, create new Segment to add into array
   * Rerturn array
   * @param columnList List column name
   */
  private convertToWhereSegment(columnList) {
    let segment: any;
    const segmentList: any = [];
    columnList.forEach((element) => {
      segment = this.uiSegmentSrv.newSegment({
        fake: false,
        value: element,
      });
      segmentList.push(segment);
    });
    return segmentList;
  }

}
