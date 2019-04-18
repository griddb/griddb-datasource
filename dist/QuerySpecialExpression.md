## Query special expression

The following expression can be used in query input to create dynamic query.

### Special variables

The follow syntax will be replace by a special value define by this Plugin.

|Name|Remark|
|---|---|
|$_timeFrom|The start of the current time range of Dash board. Replace with TIMESTAMP({Dash board start time}) .
|$_timeTo|The end of the current time range of Dash board. Replace with TIMESTAMP({Dash board end time}) .
|$_col|Use in Alias patterns. It will be replaced with the specified column name.|
|$_container|Use in Alias patterns. It will be replaced with the specified container name.|
|$_interval|This variable only used in $__timeSampling macro. Value of this variable will scale with the dash board time range. <br>Example: <br>when the dashboard show data in 1 year, $__interval = 1 day <br>when the dashboard show data in 1 day, $__interval = 1 minute
|$_minInterval|Lower limit of $__interval variable. Defined in Create Data Source screen.|

### Variables

The follow syntax will be replace by value of a custom variable define by user.

|Name|Remark|
|---|---|
|${variable name}|Replace with current variable value.|

### Macros

The follow syntax will be replace by a TQL expression.

|Name|Remark|
|---|---|
|$_timeFilter|Use to limit data. Replace with below condition: <br>{time column} > $__timeFrom AND {time column} < $__timeTo|
|$_rangeFilter|Use to limit regions annotation data. Only use in regions annotation. Replace with below condition: <br>({start time column} > $__timeFrom AND {start time column} < $__timeTo) OR ({end time column} > $__timeFrom AND {end time column} < $__timeTo)|
|$_timeSampling({column name}, {time interval})|Replace with below expression: <br>TIME_SAMPLING ({column name}, $__timeFrom, $__timeTo, {time interval value}, {time interval unit})|
