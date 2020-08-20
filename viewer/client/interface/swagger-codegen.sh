#! /bin/bash


docker pull swaggerapi/swagger-codegen-cli-v3
docker run --rm -v "${PWD}:/local" swaggerapi/swagger-codegen-cli-v3 generate \
    --input /local/prevent-api.yaml \
    --output /local/src/app/generated \
    -l typescript-angular \
    --additional-properties=ngVersion=10.0.0
