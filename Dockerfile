FROM node:8.16

WORKDIR /griddb-datasource

COPY . .

RUN npm install -g yarn
RUN yarn install
RUN yarn build

FROM grafana/grafana:6.2.0

COPY --from=0 /griddb-datasource/dist /var/lib/grafana/plugins/griddb-plugin
CMD ["/run.sh"]
