import * as _ from 'lodash';
import GridDBQuery from './query_part/griddb_query';
import GridDBAPI from './datasource_process/griddb_api';
import VariablesQueryParser from './datasource_process/variables_query_parser';
import TemplateProcessor from './datasource_process/template_processor';
import { GridDBConstant } from './util/griddb_constant';
import DataQueryFormatter from './datasource_process/res_formatter/data_query_formatter';
import AnnotationQueryFormatter from './datasource_process/res_formatter/annotation_query_formatter';
import VariablesQueryFormatter from './datasource_process/res_formatter/variables_query_formatter';
import DataQueryParser from './datasource_process/data_query_parser';

/**
 * Manage all data actions in plugin
 *
 * @export
 * @class Datasource
 */
export class Datasource {

  /**
   * Promise library
   *
   * @type {*}
   * @memberof Datasource
   */
  public $q: any;

  /**
   * Grafana Backend service
   *
   * @type {*}
   * @memberof Datasource
   */
  public backendSrv: any;

  /**
   * List url in Grafana
   *
   * @type {*}
   * @memberof Datasource
   */
  public urls: any;

  /**
   * Data of current datasource
   *
   * @type {*}
   * @memberof Datasource
   */
  public database: any;

  /**
   * Min interval of datasource
   *
   * @type {*}
   * @memberof Datasource
   */
  public minInterval: any;

  /**
   * Class to format all query before send to backend server
   *
   * @type {TemplateProcessor}
   * @memberof Datasource
   */
  public templateProcessor: TemplateProcessor;

  /**
   * Cluster name of datasource
   *
   * @type {string}
   * @memberof Datasource
   */
  public cluster: string;

  /**
   * Template service of Grafana
   *
   * @private
   * @type {*}
   * @memberof Datasource
   */
  private templateSrv: any;

  /**
   * Build GridDB API request
   *
   * @private
   * @type {GridDBAPI}
   * @memberof Datasource
   */
  private gridDBAPI: GridDBAPI;

  /**
   * call when create Datasource -> press save & test
   * @param {*} instanceSettings grafana object store setiing of data source
   * @param {*} $q service for q library
   * @param {*} backendSrv grafana object
   * @param {*} templateSrv grafana object
   */
  /* mark for web pack build. Do not delete */
  /** @ngInject */
  constructor(instanceSettings: any, $q: any, backendSrv: any, templateSrv: any) {

    // Setting for GridDB
    this.cluster = instanceSettings.jsonData.xgridcluster;
    this.database = 'public';
    this.minInterval = (instanceSettings.jsonData || {}).minInterval;

    this.urls = _.map(instanceSettings.url.split(','), (url) => {
      return url.trim();
    });

    this.$q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.templateProcessor = new TemplateProcessor();
    this.gridDBAPI = new GridDBAPI(this.cluster, this.database);
  }

  /**
   * Execute query to backend server when change query in dashboard
   *
   * 1. If target list is empty, response empty
   * 2. Loop all target
   *  1. Get container name
   *    1. If format of target is manual mode, get container name from query
   *    2. If forma of target is select box mode, get container from target
   *  2. Call {@link TemplateProcessor} to replace all macro, special variables and variables in query
   *  3. Call {@link TemplateProcessor} to replace all macro, special variables and variables in container name
   *  4. If panel is time series, all time columns to view column list
   *  5. If alias is specific, Call {@link TemplateProcessor} to replace all macro, special variables and variables in alias
   *  6. Create object to request
   * 3. Send request to backend
   *  1. If request successfully, call {@link DataQueryFormatter} to format response
   *  2. If request fail, show error message
   *
   * @param {*} options grafana object
   * @return {*} promise of data query from GridDB
   */
  public query(options: any): any {

    const scopedVars = options.scopedVars;
    const targets = _.cloneDeep(options.targets).filter((x) => this.isValidQuery(x));

    if (targets.length === 0) {
      return this.$q.when({});
    } else {
      const requestData: any[] = [];
      const formats: any[] = [];

      targets.forEach((target) => {

        const griddbTimeColumn = target.griddbTimeColumn;

        // Get alias for target
        const alias = target.alias ? target.alias.trim() : target.alias;
        const griddbQuery = new GridDBQuery(target, scopedVars);
        const timeColumn = griddbTimeColumn.text ? griddbTimeColumn.text : '';
        let query = griddbQuery.render();

        const dataReplace = {
          timeColumn: target.rawQuery ? [] : [timeColumn],
          interval: this.minInterval,
          variables: this.templateSrv.variables,
          templateSrv: this.templateSrv,
          scopedVars: scopedVars,
          timeRange: {
            intervalMs: options.intervalMs,
            range: options.range,
          },
        };

        // Format macro in server
        query = this.templateProcessor.replace(query, dataReplace);

        let container = '';

        if (target.rawQuery) {
          const dataQueryParser = new DataQueryParser();
          container = dataQueryParser.getContainer(query);
        } else {
          container = target.griddbContainer.text ? target.griddbContainer.text : '';
          container = this.templateProcessor.replace(container, dataReplace);
        }

        // query = this.templateSrv.replace(query, scopedVars);
        container = this.templateSrv.replace(container, scopedVars);

        // Get view columns
        const columns: string[] = target.griddbSelectedViewCols;

        // If time column is not added
        if (columns.indexOf(timeColumn) < 0) {
          if (target.format === GridDBConstant.FORMAT.timeSeries) {
            columns.push(timeColumn);
          }
        }

        // Add format for each target
        // target.rawQuery == true ==> manual mode
        formats.push(
          {
            raw: target.rawQuery,
            data_format: target.format,
            alias: alias,
            timeColumn: target.rawQuery ? '' : timeColumn,
          },
        );

        const body = {
          name: container,
          stmt: query,
          columns: target.rawQuery ? null : columns,
        };

        requestData.push(body);
      });

      if (requestData.length === 0) {
        return this.$q.when({ data: [] });
      }

      const tqlRequest = this.gridDBAPI.executeTQL(requestData);
      return this._griddbRequest(tqlRequest)
        .then((data: any) => {

          if (!data || !data[0]) {
            return [];
          }

          const queryFormatter = new DataQueryFormatter();
          queryFormatter.refine(formats, data);

          const resultData = queryFormatter.format(requestData, data, formats);
          return { data: resultData };

        }).catch((err) => {
          console.warn(err);

          let message = '';
          if (err.data) {
            message = err.data.errorMessage;
          } else {
            message = err.message;
          }
          throw {
            message: message,
            data: 'string',
            config: err.config,
          };

        });
    }
  }

  /**
   * Test datasource
   *
   * 1. Create object to request
   * 2. Send request to backend
   *  1. If request successfully, show success message
   *  2. If request fail, show error message
   *
   * @return {*} promise of result of testing GridDB Connection
   */
  public testDatasource(): any {

    const connectionRequest = this.gridDBAPI.testConnection();
    return this._griddbRequest(connectionRequest)
      .then((res) => {
        const error = _.get(res, 'results[0].error');
        if (error) {
          return { status: 'error', message: error };
        }
        return { status: 'success', message: 'Data source is working' };
      })
      .catch((err) => {
        return { status: 'error', message: err.message };
      });
  }

  /**
   * Call when refresh panel list to get all annotation
   *
   * 1. Validate data in annotation
   *  1. If query empty, show error
   *  2. If container empty, show error
   *  3. If normal annotation and time column empty, show error
   *  4. If regions annotation and start time/end time is empty or start time same as end time, show error
   * 2. Create object request for annotation
   * 3. Call request to backend
   *  1. If request successfully
   *    1. If result of response empty, show error message
   *    2. If normal annotation
   *      1. If response not include time column, show error
   *      2. If time column is not TIMESTAMP, show error
   *    3. If regions annotation
   *      1. If response not include start time column or end time column, show error
   *      2. If start time column or end time column is not TIMESTAMP, show error
   *    4. Call {@link AnnotationQueryFormatter} to format response
   *  2. If request fail, show error message
   *
   * @param {*} options Stored data of annotation function
   * @return {*} promise of annotation data query from GridDB
   */
  public annotationQuery(options: any): any {

    // For normal annotation
    const timeColumn: string = options.annotation.timeColumn;

    // For region annotation
    const startTimeColumn: string = options.annotation.startTimeColumn;
    const endTimeColumn: string = options.annotation.endTimeColumn;

    // For config dialog annotation
    const textColumn: string = options.annotation.textColumn;
    const tagsColumn: string = options.annotation.tagsColumn;
    const container: string = options.annotation.container;
    const isRegionsAnnotation: boolean = options.annotation.isRegionsAnnotation;
    let query = options.annotation.query;

    // Check query content
    if (!query) {
      return this.$q.reject({
        status: 'error', message: 'Query missing in annotation definition',
      });
    }

    // Check container name
    if (!container) {
      return this.$q.reject({
        status: 'error', message: 'Query missing in container name',
      });
    }

    // Check time column
    if (!isRegionsAnnotation && !timeColumn) {
      return this.$q.reject({
        status: 'error', message: 'Query missing in time column',
      });
    }

    if (isRegionsAnnotation) {
      // Check start time column
      if (!startTimeColumn) {
        return this.$q.reject({
          status: 'error', message: 'Query missing in start time column',
        });
      }

      // Check end time column
      if (!endTimeColumn) {
        return this.$q.reject({
          status: 'error', message: 'Query missing in end time column',
        });
      }

      // Check start time must be difference end time column
      if (startTimeColumn === endTimeColumn) {
        return this.$q.reject({
          status: 'error', message: 'Start time column must be difference with end time column',
        });
      }
    }

    const dataReplace = {
      timeColumn: [timeColumn],
      interval: this.minInterval,
      variables: options.variables,
      templateSrv: this.templateSrv,
      scopedVars: options.scopedVars,
      timeRange: {
        intervalMs: this.templateSrv.intervalMs,
        range: options.range,
      },
    };

    // If use time range annotation
    if (isRegionsAnnotation) {
      dataReplace.timeColumn = [startTimeColumn, endTimeColumn];
      query = this.templateProcessor.replace(query, dataReplace);
    } else {
      query = this.templateProcessor.replace(query, dataReplace);
    }

    let selectedFields: any[] = [];

    if (isRegionsAnnotation) {
      selectedFields = this.getSelectedFields(startTimeColumn, textColumn, tagsColumn, endTimeColumn);
    } else {
      selectedFields = this.getSelectedFields(timeColumn, textColumn, tagsColumn);
    }
    const dataRequest = [{
      name: container,
      stmt: query,
      columns: selectedFields,
    }];

    const tqlRequest = this.gridDBAPI.executeTQL(dataRequest);
    return this._griddbRequest(tqlRequest).then((response) => {

      let result: any;
      if (response[0]) {
        result = response[0];
      }

      if (!result || !result.columns) {
        throw { status: 'error', message: 'Query to get annotation fail' };
      }

      const columns = result.columns ? result.columns.map((x) => x.name) : [];

      // Check time column is existed in list column or not
      // And time column has TIMESTAMP type or not
      if (isRegionsAnnotation) {
        if (!columns.includes(startTimeColumn)) {
          throw { status: 'error', message: 'Start time column is not existed in GridDB column' };
        } else {
          const tmpStartColumns = result.columns.filter((x) => x.name === startTimeColumn)[0];
          const typeStartColumn = tmpStartColumns.type.toUpperCase();

          if (typeStartColumn !== 'TIMESTAMP') {
            throw { status: 'error', message: 'Start time column is not TIMESTAMP column' };
          }
        }

        if (!columns.includes(endTimeColumn)) {
          throw { status: 'error', message: 'End time column is not existed in GridDB column' };
        } else {

          const tmpEndColumns = result.columns.filter((x) => x.name === endTimeColumn)[0];
          const typeEndColumn = tmpEndColumns.type.toUpperCase();

          if (typeEndColumn !== 'TIMESTAMP') {
            throw { status: 'error', message: 'End time column is not TIMESTAMP column' };
          }
        }
      } else {
        if (!columns.includes(timeColumn)) {
          throw { status: 'error', message: 'Time column is not existed in GridDB column' };
        } else {
          const tmpTimeColumns = result.columns.filter((x) => x.name === timeColumn)[0];
          const typeTimeColumn = tmpTimeColumns.type.toUpperCase();

          if (typeTimeColumn !== 'TIMESTAMP') {
            throw { status: 'error', message: 'Time column is not TIMESTAMP column' };
          }
        }
      }

      // Check data response
      if (!result.results[0]) {
        throw { status: 'error', message: 'No results in response from GridDB' };
      }

      return new AnnotationQueryFormatter({
        data: result,
        annotation: options.annotation,
      }).getAnnotations(isRegionsAnnotation);

    }).catch((err) => {
      console.warn(err);

      let message = '';
      if (err.data) {
        message = err.data.errorMessage;
      } else {
        message = err.message;
      }

      throw {
        message: message,
        data: 'string',
        config: err.config,
      };
    });

  }

  /**
   * Execute query in variables function to get options
   *
   * 1. Call {@link VariablesQueryParser} to detect type of query
   * 2. With each type to get data request
   * 3. Call request to backend
   *  1. If request unsuccessfully, call {@link VariablesQueryFormatter} to format response
   *  2. If request fail, show error message
   *
   * @param {*} query query execute to get data for variable
   * @return {*} a promise of contain list options
   */
  public metricFindQuery(query: any): any {

    const variablesFormatter = new VariablesQueryFormatter();
    const variablesParser = new VariablesQueryParser(query);
    const queryParser = variablesParser.parse();

    let annotationRequest: any = {};
    switch (queryParser.type) {
      case GridDBConstant.VARIABLE_QUERY_TYPES.GET_ALL_CONTAINERS: {
        annotationRequest = this.gridDBAPI.getContainers(GridDBConstant.GRIDDB_GET_CONTAINERS_LIMIT);
        break;
      }

      case GridDBConstant.VARIABLE_QUERY_TYPES.GET_ALL_COLUMNS: {
        const container = queryParser.container;
        annotationRequest = this.gridDBAPI.getSchema(container);
        break;
      }

      case GridDBConstant.VARIABLE_QUERY_TYPES.GET_DATA: {
        const container = queryParser.container;
        const columns = queryParser.columns;
        const tql = queryParser.tql;
        const dataRequest = [
          {
            name: container,
            stmt: tql,
            columns: columns,
          },
        ];

        annotationRequest = this.gridDBAPI.executeTQL(dataRequest);
        break;
      }
    }

    return this._griddbRequest(annotationRequest)
      .then((res) => {
        return variablesFormatter.format(queryParser.type, res);
      })
      .catch((err) => {
        console.warn(err);

        let message = '';
        if (err.data) {
          message = err.data.errorMessage;
        } else {
          message = err.message;
        }
        throw {
          message: message,
          data: 'string',
          config: err.config,
        };
      });
  }

  /**
   * Send request to Grafana backend
   *
   * @param {*} request Contains data is send in request
   * @returns Promist of response data
   * @memberof Datasource
   */
  public _griddbRequest(request: any) {
    const method = request.method;
    const url = request.url;
    let data = request.data;
    const params: any = request.params ? request.params : {};

    const currentUrl = this.urls.shift();
    this.urls.push(currentUrl);

    // If url not available
    if (!url) {
      return this.$q.when({ results: [] });
    }

    // If method is GET, set data for parameters
    if (method === 'GET') {
      _.extend(params, data);
      data = null;
    }

    const req: any = {
      method: method,
      url: currentUrl + url,
      params: params,
      data: data,
      inspect: { type: 'griddb' },
    };

    if (data && data[0] && data[0].stmt) {
      data.forEach((element) => {
        console.log('Data request: \n');
        console.log(element);
      });

    }

    return this.backendSrv.datasourceRequest(req).then(
      (result) => {
        return result.data;
      },
      (err) => {
        if (err.status !== 0 || err.status >= 300) {
          if (err.data && err.data.error) {
            throw {
              message: 'GridDB Error: ' + err.data.error,
              data: err.data,
              config: err.config,
            };
          } else {
            throw {
              message: 'Network Error: ' + err.statusText + '(' + err.status + ')',
              data: err.data,
              config: err.config,
            };
          }
        }
      },
    );
  }

  /**
   * Call get container API to get containers from database
   *
   * @returns Promise of backend response
   * @memberof Datasource
   */
  public getContainerList() {
    const containerRequest = this.gridDBAPI.getContainers(GridDBConstant.GRIDDB_GET_CONTAINERS_LIMIT);
    return this._griddbRequest(containerRequest);
  }

  /**
   * Call get container schema API to get container information
   *
   * @param {*} contanerName Container name
   * @returns Promise of backend response
   * @memberof Datasource
   */
  public getColumnList(contanerName) {
    const columnRequest = this.gridDBAPI.getSchema(contanerName);
    return this._griddbRequest(columnRequest);
  }

  /**
   * Return array columns base on column list
   *
   * @private
   * @param {string} startTimeColumn Start time column
   * @param {string} textColumn Text column
   * @param {string} tagsColumn Tag column
   * @param {(string | undefined)} [endTimeColumn] End time column
   * @returns {string[]} Array container columns list to request
   * @memberof Datasource
   */
  private getSelectedFields(startTimeColumn: string, textColumn: string, tagsColumn: string, endTimeColumn?: string | undefined): string[] {
    let fields: string[] = [];

    if (startTimeColumn) {
      fields.push(startTimeColumn);
    }

    if (textColumn) {
      fields.push(textColumn);
    }

    if (endTimeColumn) {
      fields.push(endTimeColumn);
    }

    // Get column and remove space
    let columns: string[] = [];
    if (tagsColumn && tagsColumn.trim().length > 0) {
      columns = tagsColumn.split(',');
      columns = columns.map((column) => column.trim());
    }

    fields = fields.concat(columns);

    // Remove duplicate item in array
    fields = _.uniq(fields);

    return fields;
  }

  /**
   * 1. Return true if query is valid
   * 2. Return false if query is invalid. False if include 1 conditions below:
   *  1. If select box
   *    1. Container name is not selected
   *    2. If Checked time sampling for collection container
   *    3. If format is timeseries
   *      1. Time is not selected
   *      2. View is not selected
   *  2. If raw
   *    1. Query empty or null
   * @param target Stored specific query
   */
  private isValidQuery(target: any): boolean {

    // Check target is hide or not
    if (target.hide) {
      return false;
    }

    // Use select box mode
    if (!target.rawQuery) {
      const griddbContainer = target.griddbContainer;
      if (!griddbContainer || !griddbContainer.text) {
        return false;
      }

      // Check time sampling of collection container
      const containerType = target.griddbSelectedContainerType;
      if (containerType && containerType.toUpperCase() === GridDBConstant.GRIDDB_CONTAINER_TYPE.COLLECTION) {
        const griddbIsTimeSampling: boolean = target.griddbIsTimeSampling ? target.griddbIsTimeSampling : false;
        if (griddbIsTimeSampling) {
          throw { message: 'Time sampling not available with collection container' };
        }
      }

      if (target.format === GridDBConstant.FORMAT.timeSeries) {
        const griddbTimeColumn = target.griddbTimeColumn;
        // Check time column is selected or not
        if (!griddbTimeColumn || (griddbTimeColumn && griddbTimeColumn.fake)) {
          return false;
        }

        // Check view column is selected or not
        if (!target.griddbSelectedViewCols || target.griddbSelectedViewCols.length === 0) {
          return false;
        }
      }
      if (target.format === GridDBConstant.FORMAT.table) {
        if (target.griddbContainer.value === 'select-container') {
          return false;
        }
      }

    } else {
      if (!target.query || !target.query.trim()) {
        return false;
      }
    }
    return true;
  }

}
