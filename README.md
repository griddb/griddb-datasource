GridDB Data Source for Grafana

## Overview

This Plugin will be used to get data from GridDB and display as graph or table base on [Grafana platform](https://grafana.com/).

## Operating environment

Building of the plugin and execution have been checked in the following environment.

    OS: CentOS 7.4(x64)
    GridDB Server and Java Client: 4.1 CE
    GridDB WebAPI: 2.0

## QuickStart

### How to build

Go to source include file package.json and run the command below:

    $ npm install -g yarn
    $ yarn install
    $ yarn build

### How to installation

1. Go to $GRAFANA_HOME/data/plugins, create a new folder "GridDB-plugin"
    + Note: This folder is created after run Grafana server the first time.
2. Build GridDB plugin source code, copy folder "dist" to folder "GridDB-plugin"
3. Restart your Grafana server 

### How to use

#### Adding the data source

1. Open the side menu by clicking the Grafana icon in the top header.
2. In the side menu under the Configuration link you should find a link named Data Sources
3. Click the + Add data source button in the top header
4. Select GridDB from the Type dropdown
5. Click to Save & Test button to check the connection to datasource. System use basic authentication to authenticate to GridDB server

|Name|Description|
|---|---|
|Name|Datasource name|
|Host|URL to GridDB WebAPI|
|Cluster|Cluster name|
|User|GridDB user name|
|Password|GridDB password|

#### Variable

You can use three formats below to create variable;

|Format|Description|
|---|---|
|$griddb_container_list| Get all containers|
|$griddb_column_list({container name})|Get all columns of a specific container|
|$griddb_query_data({container name}, {columns}, {TQL})|Get data of a specific container|

#### Annotation

There are two types: normal annotation and regions annotation.

- Annotation
    + Please add "where $_timeFilter" in Query.
- Regions Annotation
    + Please add "where $_rangeFilter" in Query.

#### Query

Please refer to [Query special expression](QuerySpecialExpression.md).

## Community

  * Issues  
    Use the GitHub issue function if you have any requests, questions, or bug reports. 
  * PullRequest  
    Use the GitHub pull request function if you want to contribute code.
    You'll need to agree GridDB Contributor License Agreement(CLA_rev1.1.pdf).
    By using the GitHub pull request function, you shall be deemed to have agreed to GridDB Contributor License Agreement.

## License
  
  This Plugin source license is Apache License, version 2.0.
