
/**
 * Parse query to get Container name before send to server
 *
 * @export
 * @class DataQueryParser
 */
export default class DataQueryParser {

  /**
   * Regex to get container from TQL
   *
   * @memberof DataQueryParser
   */
  public GET_CONTAINER_REGEX = /^\s*select.*[\s*)']from\s+([a-zA-Z0-9_]*)\s*(?:$|limit|order|where).*$/gi;

  /**
   * Get container from query
   * Show error message if query is wrong format or cannot container name from tql
   *
   * @param {string} query TQL query
   * @returns container name
   * @memberof DataQueryParser
   */
  public getContainer(query: string) {

    let container: string = '';
    if (!query || !query.trim()) {
      throw { message: 'Query must be not empty' };
    } else {
      query = query.replace(/(\r\n|\n|\r)/gm, ' ');
      if (query.match(this.GET_CONTAINER_REGEX)) {
        const containerResult = this.GET_CONTAINER_REGEX.exec(query);
        if (containerResult && containerResult.length > 1 && containerResult[1]) {
          container = ('' + containerResult[1]).trim();
        } else {
          throw { message: 'Cannot detect container name from query' };
        }
      } else {
        throw { message: 'Query is wrong format' };
      }
      return container;
    }
  }
}
