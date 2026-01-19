#!/usr/bin/env bash
# Run Go tests with coverage report

set -e

cd "$(dirname "$0")/.."
go test -mod=vendor -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
echo "Coverage report generated: coverage.html"
