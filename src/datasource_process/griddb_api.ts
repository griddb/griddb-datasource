
const SERVER_URL = '/griddb/v2/';

export const GRIDDB_API_LIST = {
    // /gs_api/v2/{clusterName}/dbs/{databaseName}/checkConnection
    testDatasource: SERVER_URL + '{0}/dbs/{1}/checkConnection',

    // gs_api/v2/{clusterName}/dbs/{databaseName}/tql
    TQLQuery: SERVER_URL + '{0}/dbs/{1}/tql',

    // gs_api/v2/:cluster/dbs/:database/containers
    containers: SERVER_URL + '{0}/dbs/{1}/containers',

    // gs_api/v2/:cluster/dbs/:database/containers/:container/info
    schema: SERVER_URL + '{0}/dbs/{1}/containers/{2}/info',
};

/**
 * Manage api to griddb server
 *
 * @export
 * @class GridDBAPI
 */
export default class GridDBAPI {

    /**
     * Cluster name
     *
     * @private
     * @type {string}
     * @memberof GridDBAPI
     */
    private cluster: string;

    /**
     * Database name
     *
     * @private
     * @type {string}
     * @memberof GridDBAPI
     */
    private database: string;

    /**
     * Creates an instance of GridDBAPI.
     * @param {string} cluster Cluster name
     * @param {string} database database name
     * @memberof GridDBAPI
     */
    constructor(cluster: string, database: string) {
        this.cluster = cluster;
        this.database = database;
    }

    /**
     * Create object request to execute TQL API
     *
     * @param {*} dataRequest Data container stmt, name and columns
     * @returns request object to call TQL API
     * @memberof GridDBAPI
     */
    public executeTQL(dataRequest: any) {
        return {
            url: this.getURL(GRIDDB_API_LIST.TQLQuery, [this.cluster, this.database]),
            method: 'POST',
            data: dataRequest,
        };
    }

    /**
     * Create object request to test connection API
     *
     * @returns request object to call test connect to GridDB server API
     * @memberof GridDBAPI
     */
    public testConnection() {
        const paramRequest = {
            timeout: 1,
        };

        return {
            url: this.getURL(GRIDDB_API_LIST.testDatasource, [this.cluster, this.database]),
            method: 'GET',
            data: {},
            param: paramRequest,
        };
    }

    /**
     * Create object request to get containers in database
     *
     * @param {number} limit Limit number of containers
     * @returns request object to get containers in database
     * @memberof GridDBAPI
     */
    public getContainers(limit: number) {
        const paramRequest = {
            limit: limit,
        };

        return {
            url: this.getURL(GRIDDB_API_LIST.containers, [this.cluster, this.database]),
            method: 'GET',
            data: {},
            params: paramRequest,
        };
    }

    /**
     * Create object request to get table schema
     *
     * @param {string} container Container name
     * @returns request object to get containers schema
     * @memberof GridDBAPI
     */
    public getSchema(container: string) {
        return {
            url: this.getURL(GRIDDB_API_LIST.schema, [this.cluster, this.database, container]),
            method: 'GET',
            data: {},
        };
    }

    /**
     * Get URL with parameters
     *
     * @private
     * @param {string} url base URL
     * @param {string[]} params Parameters is used in URL
     * @returns {string} URL is combine with parameters
     * @memberof GridDBAPI
     */
    private getURL(url: string, params: string[]): string {
        const lenParams: number = params.length;

        let i: number;
        for (i = 0; i < lenParams; i++) {
            const local = '\\{' + i + '\\}';
            const value = encodeURIComponent(params[i]);
            url = url.replace(new RegExp(local, 'g'), value);
        }

        return url;
    }

}
