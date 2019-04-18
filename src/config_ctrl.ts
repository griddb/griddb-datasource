/**
 * Controller object for configure datasource view
 *
 * @export
 * @class ConfigCtrl
 */
export class ConfigCtrl {
    public static templateUrl: string = 'partials/config.html';
    public current: any;

    /* mark for web pack build. Do not delete */
    /** @ngInject */
    constructor() {
        this.current.access = 'proxy';
        this.current.basicAuth = true;
        if (!this.current.jsonData.minInterval) {
            this.current.jsonData.minInterval = '1s';
        }
    }
}
