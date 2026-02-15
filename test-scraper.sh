#!/bin/bash

# Test the Daily Insights scraper API endpoint
echo "Testing Daily Insights Scraper API..."
echo ""

# POST request to trigger scraper
echo "Running scraper..."
curl -X POST http://localhost:3000/api/daily-insights/scrape \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

echo ""
echo ""
echo "Getting articles..."
curl http://localhost:3000/api/daily-insights?status=pending \
  -w "\nStatus: %{http_code}\n"
