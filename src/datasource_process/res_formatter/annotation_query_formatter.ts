import * as _ from 'lodash';

/**
 * Format response of annotation query in annotation query function
 */
export default class AnnotationQueryFormatter {

  /**
   * Data of GridDB
   *
   * @type {*}
   * @memberof AnnotationQueryFormatter
   */
  public containers: any;

  /**
   * Annotation config
   *
   * @type {*}
   * @memberof AnnotationQueryFormatter
   */
  public annotation: any;

  /**
   * Time column in container
   *
   * @type {string}
   * @memberof AnnotationQueryFormatter
   */
  public timeCol: string;

  /**
   * Creates an instance of AnnotationQueryFormatter.
   * @param {{ data: any; annotation: any; alias?: any; }} options
   * @memberof AnnotationQueryFormatter
   */
  constructor(options: { data: any; annotation: any }) {
    this.containers = options.data;
    this.annotation = options.annotation;
  }

  /**
   * Check type of annotation, after that format response data
   *
   * @param {boolean} isRegionsAnnotation
   * @returns Data is formatted
   * @memberof AnnotationFormatter
   */
  public getAnnotations(isRegionsAnnotation: boolean) {
    if (isRegionsAnnotation) {
      return this.getRegionsAnnotation();
    } else {
      return this.getNormalAnnotation();
    }

  }

  /**
   * Format response for normal annotation
   *
   * @private
   * @returns Data is formatted for normal annotation
   * @memberof AnnotationFormatter
   */
  public getNormalAnnotation() {
    const list: any[] = [];
    const container = this.containers;

    let timeCol = '';
    const tagsCol: string[] = [];
    let textCol = '';

    // Load all columns of container
    // column: name
    // index: index of column: 0, 1, 2...
    let i: number;
    for (i = 0; i < container.columns.length; i++) {

      const column = container.columns[i].name;
      const index = '' + i;

      // Choose time column from list column
      // Check column name has same name with timeColumn
      if (column === this.annotation.timeColumn) {
        timeCol = index;
      }

      // Check list tag column has contain this column yes or not?
      // Ex: var arr = ['a','b','c']; ==> _.includes(arr,'c') is true
      // If yes, set index for tagsCol
      const separatedTags: string[] = (this.annotation.tagsColumn || '').split(' ').join('').split(',');
      if (_.includes(separatedTags, column)) {
        tagsCol.push(index);
      }

      // Check this column is text column or not?
      // If yes, set index for textCol
      if (column === this.annotation.textColumn) {
        textCol = index;
      }

    }

    // Check with data of container
    // Loop each row in data
    _.each(container.results, (value) => {

      const data = {
        annotation: this.annotation,
        time: new Date(value[timeCol]).getTime(),

        // Remove empty values, then split in different tags for comma separated values
        // ???
        tags: _.flatten(
          tagsCol
            .filter((t) => {
              return value[t];
            })
            .map((t) => {
              const x = '' + value[t];
              const y = '' + x.split(',');

              return y;
            }),
        ),
        text: value[textCol] ? ('' + value[textCol]) : '',
      };

      list.push(data);
    });

    return list;
  }

  /**
   * Get response to regions annotation
   *
   * @private
   * @returns data is formatted
   * @memberof AnnotationQueryFormatter
   */
  public getRegionsAnnotation() {
    const list: any[] = [];
    const container = this.containers;

    let startTimeColumn = '';
    let endTimeColumn = '';
    const tagsCol: string[] = [];
    let textCol = '';

    // Load all columns of container
    // column: name
    // index: index of column: 0, 1, 2...
    let i: number;
    for (i = 0; i < container.columns.length; i++) {

      const column = container.columns[i].name;
      const index = '' + i;

      // Choose time column from list column
      // Check column name has same name with startTimeColumn
      if (column === this.annotation.startTimeColumn) {
        startTimeColumn = index;
      }

      // Choose time column from list column
      // Check column name has same name with endTimeColumn
      if (column === this.annotation.endTimeColumn) {
        endTimeColumn = index;
      }

      // Check list tag column has contain this column yes or not?
      // Ex: var arr = ['a','b','c']; ==> _.includes(arr,'c') is true
      // If yes, set index for tagsCol
      const separatedTags: string[] = (this.annotation.tagsColumn || '').split(' ').join('').split(',');
      if (_.includes(separatedTags, column)) {
        tagsCol.push(index);
      }

      // Check this column is text column or not?
      // If yes, set index for textCol
      if (column === this.annotation.textColumn) {
        textCol = index;
      }

    }

    // Check with data of container
    // Loop each row in data
    _.each(container.results, (value, index) => {

      if (value[startTimeColumn] < value[endTimeColumn]) {

        const startDataTime = {
          annotation: this.annotation,
          time: new Date(value[startTimeColumn]).getTime(),
          regionId: '' + index,

          // Remove empty values, then split in different tags for comma separated values
          tags: _.flatten(
            tagsCol
              .filter((t) => {
                return value[t];
              })
              .map((t) => {
                const x = '' + value[t];
                const y = '' + x.split(',');

                return y;
              }),
          ),
          text: value[textCol] ? ('' + value[textCol]) : '',
        };

        const endDataTime = {
          time: new Date(value[endTimeColumn]).getTime(),
          regionId: '' + index,
        };

        list.push(startDataTime);
        list.push(endDataTime);
      }

    });

    return list;
  }
}
