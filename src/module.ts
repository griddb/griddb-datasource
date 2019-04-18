import { Datasource } from './datasource';
import { DataQueryCtrl } from './data_query_ctrl';
import { ConfigCtrl } from './config_ctrl';
import { AnnotationsQueryCtrl } from './annotation_query_ctrl';

/**
 * Object to expose plugin module to Grafana front end
 *
 * @export
 */
export {
    Datasource as Datasource,
    DataQueryCtrl as QueryCtrl,
    ConfigCtrl as ConfigCtrl,
    AnnotationsQueryCtrl as AnnotationsQueryCtrl,
};
