#!/bin/bash
set -e
# Start GridDB
echo "Start node"
su - gsadm -c "gs_startnode -w 5 -u admin/admin"
echo "Join cluster"
su - gsadm -c "gs_joincluster -c test -n 1 -u admin/admin"

# Insert data
echo "Insert data"
java -jar /griddb-datasource/sample/SampleData/target/SampleData.jar

# Start WebAPI
echo "Run WebAPI"
export GRIDDB_WEBAPI_HOME=/webapi
export LOADER_PATH=/webapi/lib/gridstore.jar
java -jar /webapi/webapi-ce/build/libs/griddb-webapi-ce-2.0.0.jar &

tail -f /dev/null
