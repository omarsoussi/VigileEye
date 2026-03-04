# Custom MediaMTX image that includes CA certificates.
# The upstream image is intentionally minimal and lacks a system trust store,
# which breaks HTTPS/HLS sources with: x509: certificate signed by unknown authority.

FROM bluenviron/mediamtx:latest AS upstream

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata \
  && update-ca-certificates

COPY --from=upstream /mediamtx /mediamtx

EXPOSE 8554 1935 8888 8889 9997
ENTRYPOINT ["/mediamtx"]
