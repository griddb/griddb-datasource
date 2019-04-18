
export const GridDBConstant = {

    VARIABLE_QUERY_TYPES: {
        GET_ALL_CONTAINERS: 'CONTAINERS',
        GET_ALL_COLUMNS: 'COLUMNS',
        GET_DATA: 'DATA',
    },
    GRIDDB_TIMESAMPLING_TYPE: {
        day: 'DAY',
        hour: 'HOUR',
        minute: 'MINUTE',
        second: 'SECOND',
        millisecond: 'MILLISECOND',
    },
    GRAFANA_TIME_UNITS_TYPE: {
        millisecond: 'ms',
        seconds: 's',
        minutes: 'm',
        hours: 'h',
        days: 'd',
        weeks: 'w',
        months: 'M',
        years: 'y',
    },
    // Grafana data format
    FORMAT: {
        table: 'table',
        timeSeries: 'time-series',
    },
    NUMBER_TYPE_GRIDDB: {
        byte: 'BYTE',
        short: 'SHORT',
        integer: 'INTEGER',
        long: 'LONG',
        float: 'FLOAT',
        double: 'DOUBLE',
    },
    GRIDDB_GET_CONTAINERS_LIMIT: 1000,
    GRIDDB_CONTAINER_TYPE: {
        COLLECTION: 'COLLECTION',
        TIMESERIES: 'TIME_SERIES',
    },
};
