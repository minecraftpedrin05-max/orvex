# ORVEX sozinho (sem modelo). Serve o app e a API em qualquer lugar que rode Docker.
FROM node:22-bookworm-slim
WORKDIR /app
COPY . .
ENV PORT=3000 HOST=0.0.0.0 DATA_DIR=/data
VOLUME /data
EXPOSE 3000
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
