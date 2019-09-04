FROM node:8.16

RUN git clone https://github.com/griddb/griddb-datasource && \
    cd griddb-datasource && \
    npm install -g yarn && \
    yarn install && \
    yarn build

FROM grafana/grafana:latest

COPY --from=0 /griddb-datasource/dist /var/lib/grafana/plugins/griddb-plugin
CMD ["/run.sh"]
